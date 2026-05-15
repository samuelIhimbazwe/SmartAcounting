package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.config.SmsProperties;
import com.smartaccounting.entity.NotificationSmsDeliveryLog;
import com.smartaccounting.repository.NotificationSmsDeliveryLogRepository;
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
        if (smsProperties.isDryRun() || smsProperties.getProviderUrl().isBlank()) {
            log.info("SMS dry-run tenant={} eventType={} to={} message={}", tenantId, eventType, phone, message);
            return new DispatchResult(true, "DRY_RUN", null, null);
        }
        HttpURLConnection con = null;
        try {
            URL url = new URL(smsProperties.getProviderUrl());
            con = (HttpURLConnection) url.openConnection();
            con.setRequestMethod("POST");
            con.setDoOutput(true);
            con.setConnectTimeout(smsProperties.getConnectTimeoutMs());
            con.setReadTimeout(smsProperties.getReadTimeoutMs());
            con.setRequestProperty("Content-Type", "application/json");
            if (!smsProperties.getBearerToken().isBlank()) {
                con.setRequestProperty("Authorization", "Bearer " + smsProperties.getBearerToken());
            }
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("tenantId", tenantId.toString());
            body.put("eventType", eventType);
            body.put("to", phone);
            body.put("senderId", smsProperties.getSenderId());
            body.put("message", message);
            byte[] payload = objectMapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = con.getOutputStream()) {
                os.write(payload);
            }
            int code = con.getResponseCode();
            boolean ok = code >= 200 && code < 300;
            return new DispatchResult(ok, ok ? "SENT" : "FAILED", code, ok ? null : ("HTTP " + code));
        } catch (Exception ex) {
            log.warn("SMS send failed tenant={} eventType={} to={} reason={}", tenantId, eventType, phone, ex.getMessage());
            return new DispatchResult(false, "FAILED", null, ex.getMessage());
        } finally {
            if (con != null) {
                con.disconnect();
            }
        }
    }

    private void logDelivery(UUID tenantId, UUID eventId, String eventType, String recipient, DispatchResult result) {
        NotificationSmsDeliveryLog logRow = new NotificationSmsDeliveryLog();
        logRow.setId(UUID.randomUUID());
        logRow.setTenantId(tenantId);
        logRow.setNotificationEventId(eventId);
        logRow.setEventType(eventType);
        logRow.setRecipientPhone(recipient);
        logRow.setStatus(result.status());
        logRow.setResponseCode(result.responseCode());
        logRow.setErrorMessage(result.errorMessage());
        logRow.setCreatedAt(java.time.Instant.now());
        smsDeliveryLogRepository.save(logRow);
    }

    private record DispatchResult(boolean success, String status, Integer responseCode, String errorMessage) {}
}
