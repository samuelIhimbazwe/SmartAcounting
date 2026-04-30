package com.smartchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.entity.WebhookDeliveryLog;
import com.smartchain.entity.WebhookSubscription;
import com.smartchain.repository.WebhookDeliveryLogRepository;
import com.smartchain.repository.WebhookSubscriptionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class WebhookDispatchService {
    private final WebhookSubscriptionRepository subscriptionRepository;
    private final WebhookDeliveryLogRepository deliveryLogRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public WebhookDispatchService(WebhookSubscriptionRepository subscriptionRepository,
                                  WebhookDeliveryLogRepository deliveryLogRepository,
                                  ObjectMapper objectMapper) {
        this.subscriptionRepository = subscriptionRepository;
        this.deliveryLogRepository = deliveryLogRepository;
        this.objectMapper = objectMapper;
    }

    @Async
    public void dispatch(String eventType, Map<String, Object> payload) {
        List<WebhookSubscription> subscriptions = subscriptionRepository.findByEventTypeAndActiveTrue(eventType);
        for (WebhookSubscription sub : subscriptions) {
            WebhookDeliveryLog log = new WebhookDeliveryLog();
            log.setId(UUID.randomUUID());
            log.setTenantId(sub.getTenantId());
            log.setSubscriptionId(sub.getId());
            log.setEventType(eventType);
            try {
                String body = objectMapper.writeValueAsString(payload);
                log.setPayload(body);
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                String signature = hmacSha256Hex(sub.getSecret(), body);
                headers.set("X-SmartChain-Signature", signature);
                log.setSignature(signature);
                var response = restTemplate.postForEntity(sub.getCallbackUrl(), new HttpEntity<>(body, headers), String.class);
                log.setStatus("SENT");
                log.setResponseCode(response.getStatusCode().value());
            } catch (Exception e) {
                log.setStatus("FAILED");
                log.setResponseCode(0);
                log.setPayload("{}");
                log.setRetryCount(0);
                log.setNextAttemptAt(Instant.now().plusSeconds(60));
            }
            log.setCreatedAt(Instant.now());
            deliveryLogRepository.save(log);
        }
    }

    @Scheduled(fixedDelayString = "${smartchain.webhook.retry-delay-ms:30000}")
    public void retryFailed() {
        deliveryLogRepository.findAll().stream()
            .filter(l -> "FAILED".equals(l.getStatus()))
            .filter(l -> l.getRetryCount() < 5)
            .filter(l -> l.getNextAttemptAt() == null || !l.getNextAttemptAt().isAfter(Instant.now()))
            .limit(30)
            .forEach(log -> {
                log.setRetryCount(log.getRetryCount() + 1);
                log.setNextAttemptAt(Instant.now().plusSeconds((long) Math.pow(2, log.getRetryCount()) * 30));
                deliveryLogRepository.save(log);
            });
    }

    private String hmacSha256Hex(String secret, String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign webhook payload", e);
        }
    }
}
