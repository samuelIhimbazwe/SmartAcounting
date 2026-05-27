package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.config.SmsProperties;
import com.smartaccounting.entity.NotificationSmsDeliveryLog;
import com.smartaccounting.repository.NotificationSmsDeliveryLogRepository;
import com.smartaccounting.sms.RwandaMobileNetwork;
import com.smartaccounting.sms.RwandaMobileNetworkDetector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SmsDispatchService {
    private static final Logger log = LoggerFactory.getLogger(SmsDispatchService.class);

    private final SmsProperties smsProperties;
    private final ObjectMapper objectMapper;
    private final NotificationSmsDeliveryLogRepository smsDeliveryLogRepository;

    public SmsDispatchService(SmsProperties smsProperties,
                              ObjectMapper objectMapper,
                              NotificationSmsDeliveryLogRepository smsDeliveryLogRepository) {
        this.smsProperties = smsProperties;
        this.objectMapper = objectMapper;
        this.smsDeliveryLogRepository = smsDeliveryLogRepository;
    }

    public int send(UUID tenantId, UUID notificationEventId, String eventType, List<String> recipients, String message) {
        if (recipients == null || recipients.isEmpty()) {
            return 0;
        }
        if (!smsProperties.isEnabled()) {
            return 0;
        }
        int delivered = 0;
        for (String to : recipients) {
            String phone = to == null ? "" : to.trim();
            if (phone.isEmpty()) {
                continue;
            }
            DispatchResult result = sendOne(tenantId, eventType, phone, message);
            logDelivery(tenantId, notificationEventId, eventType, phone, result);
            if (result.success()) {
                delivered++;
            }
        }
        return delivered;
    }

    private DispatchResult sendOne(UUID tenantId, String eventType, String phone, String message) {
        if (smsProperties.isDryRun() || !smsProperties.isLiveDispatchConfigured()) {
            RwandaMobileNetwork network = resolveNetwork(phone);
            log.info(
                "SMS dry-run tenant={} eventType={} carrier={} to={} message={}",
                tenantId,
                eventType,
                RwandaMobileNetworkDetector.networkLabel(network),
                phone,
                message
            );
            return new DispatchResult(true, "DRY_RUN", network, null, null);
        }

        RwandaMobileNetwork network = resolveNetwork(phone);
        if (smsProperties.isRouteByNetwork()) {
            return switch (network) {
                case MTN -> sendViaCarrier(tenantId, eventType, phone, message, network, smsProperties.getMtn());
                case AIRTEL -> sendViaCarrier(tenantId, eventType, phone, message, network, smsProperties.getAirtel());
                case UNKNOWN -> sendViaLegacyOrFail(tenantId, eventType, phone, message, network);
            };
        }
        return sendViaLegacyOrFail(tenantId, eventType, phone, message, network);
    }

    private DispatchResult sendViaCarrier(
        UUID tenantId,
        String eventType,
        String phone,
        String message,
        RwandaMobileNetwork network,
        SmsProperties.CarrierGateway gateway
    ) {
        if (!gateway.isConfigured()) {
            log.warn(
                "SMS no {} gateway configured for {} — set smartaccounting.sms.{}.provider-url",
                RwandaMobileNetworkDetector.networkLabel(network),
                phone,
                network.name().toLowerCase()
            );
            return new DispatchResult(
                false,
                "NO_GATEWAY",
                network,
                null,
                "No SMS gateway for " + RwandaMobileNetworkDetector.networkLabel(network)
            );
        }
        String senderId = gateway.getSenderId().isBlank() ? smsProperties.getSenderId() : gateway.getSenderId();
        return httpSend(tenantId, eventType, phone, message, network, gateway.getProviderUrl(), gateway.getBearerToken(), senderId);
    }

    private DispatchResult sendViaLegacyOrFail(
        UUID tenantId,
        String eventType,
        String phone,
        String message,
        RwandaMobileNetwork network
    ) {
        if (smsProperties.isLegacyProviderConfigured()) {
            return httpSend(
                tenantId,
                eventType,
                phone,
                message,
                network,
                smsProperties.getProviderUrl(),
                smsProperties.getBearerToken(),
                smsProperties.getSenderId()
            );
        }
        return new DispatchResult(
            false,
            "FAILED",
            network,
            null,
            "No SMS gateway configured for network " + RwandaMobileNetworkDetector.networkLabel(network)
        );
    }

    private DispatchResult httpSend(
        UUID tenantId,
        String eventType,
        String phone,
        String message,
        RwandaMobileNetwork network,
        String providerUrl,
        String bearerToken,
        String senderId
    ) {
        HttpURLConnection con = null;
        try {
            URL url = new URL(providerUrl);
            con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("POST");
            con.setDoOutput(true);
            con.setConnectTimeout(smsProperties.getConnectTimeoutMs());
            con.setReadTimeout(smsProperties.getReadTimeoutMs());
            con.setRequestProperty("Content-Type", "application/json");
            if (bearerToken != null && !bearerToken.isBlank()) {
                con.setRequestProperty("Authorization", "Bearer " + bearerToken);
            }
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("tenantId", tenantId.toString());
            body.put("eventType", eventType);
            body.put("carrier", RwandaMobileNetworkDetector.networkLabel(network));
            body.put("to", phone);
            body.put("msisdn", phone.replace("+", ""));
            body.put("senderId", senderId);
            body.put("message", message);
            byte[] payload = objectMapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = con.getOutputStream()) {
                os.write(payload);
            }
            int code = con.getResponseCode();
            boolean ok = code >= 200 && code < 300;
            if (!ok) {
                log.warn(
                    "SMS send failed tenant={} carrier={} to={} http={}",
                    tenantId,
                    RwandaMobileNetworkDetector.networkLabel(network),
                    phone,
                    code
                );
            }
            return new DispatchResult(
                ok,
                ok ? "SENT" : "FAILED",
                network,
                code,
                ok ? null : ("HTTP " + code)
            );
        } catch (Exception ex) {
            log.warn(
                "SMS send failed tenant={} carrier={} to={} reason={}",
                tenantId,
                RwandaMobileNetworkDetector.networkLabel(network),
                phone,
                ex.getMessage()
            );
            return new DispatchResult(false, "FAILED", network, null, ex.getMessage());
        } finally {
            if (con != null) {
                con.disconnect();
            }
        }
    }

    private RwandaMobileNetwork resolveNetwork(String phone) {
        return RwandaMobileNetworkDetector.detect(
            phone,
            smsProperties.resolvedMtnPrefixes(),
            smsProperties.resolvedAirtelPrefixes()
        );
    }

    private void logDelivery(UUID tenantId, UUID eventId, String eventType, String recipient, DispatchResult result) {
        NotificationSmsDeliveryLog logRow = new NotificationSmsDeliveryLog();
        logRow.setId(UUID.randomUUID());
        logRow.setTenantId(tenantId);
        logRow.setNotificationEventId(eventId);
        String carrierSuffix = result.network() == RwandaMobileNetwork.UNKNOWN
            ? ""
            : ":" + result.network().name();
        logRow.setEventType(eventType + carrierSuffix);
        logRow.setRecipientPhone(recipient);
        logRow.setStatus(result.status());
        logRow.setResponseCode(result.responseCode());
        logRow.setErrorMessage(result.errorMessage());
        logRow.setCreatedAt(java.time.Instant.now());
        try {
            smsDeliveryLogRepository.save(logRow);
        } catch (RuntimeException ex) {
            log.warn("SMS delivery log not persisted tenant={} eventType={}: {}", tenantId, eventType, ex.getMessage());
        }
    }

    private record DispatchResult(
        boolean success,
        String status,
        RwandaMobileNetwork network,
        Integer responseCode,
        String errorMessage
    ) {
    }
}
