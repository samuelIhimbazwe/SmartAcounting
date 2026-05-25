package com.smartaccounting.service;

import com.smartaccounting.config.MobileMoneyProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * MTN MoMo Collections request-to-pay (STK push). Requires live credentials in application-prod.yml.
 */
@Service
public class MomoStkService {
    private static final Logger log = LoggerFactory.getLogger(MomoStkService.class);

    private final MobileMoneyProperties properties;
    private final StringRedisTemplate redisTemplate;
    private final RestClient restClient = RestClient.create();

    public MomoStkService(MobileMoneyProperties properties, StringRedisTemplate redisTemplate) {
        this.properties = properties;
        this.redisTemplate = redisTemplate;
    }

    public Map<String, Object> initiateStkPush(String phoneNumber, BigDecimal amount, String orderId) {
        String referenceId = UUID.randomUUID().toString();
        if (!properties.isStkLiveEnabled()) {
            log.info("MoMo STK dry-run referenceId={} orderId={} phone={} amount={}",
                referenceId, orderId, phoneNumber, amount);
            return Map.of(
                "referenceId", referenceId,
                "status", "PENDING",
                "mode", "dry-run");
        }

        String token = fetchAccessToken();
        String base = properties.getStkBaseUrl().replaceAll("/+$", "");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amount.stripTrailingZeros().toPlainString());
        body.put("currency", "RWF");
        body.put("externalId", orderId);
        body.put("payer", Map.of("partyIdType", "MSISDN", "partyId", sanitizeMsisdn(phoneNumber)));
        body.put("payerMessage", "SmartAccounting payment");
        body.put("payeeNote", "Order " + orderId);

        restClient.post()
            .uri(base + "/collection/v1_0/requesttopay")
            .header("Authorization", "Bearer " + token)
            .header("X-Reference-Id", referenceId)
            .header("X-Target-Environment", properties.getStkTargetEnvironment())
            .header("Ocp-Apim-Subscription-Key", properties.getStkSubscriptionKey())
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .toBodilessEntity();

        redisTemplate.opsForValue().set(
            "momo:stk:" + referenceId,
            orderId,
            Duration.ofMinutes(10));

        return Map.of(
            "referenceId", referenceId,
            "status", "PENDING",
            "mode", "live");
    }

    private String fetchAccessToken() {
        String base = properties.getStkBaseUrl().replaceAll("/+$", "");
        String credentials = properties.getStkApiUser() + ":" + properties.getStkApiKey();
        String basic = Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
        Map<?, ?> tokenResponse = restClient.post()
            .uri(base + "/collection/token/")
            .header("Authorization", "Basic " + basic)
            .header("Ocp-Apim-Subscription-Key", properties.getStkSubscriptionKey())
            .retrieve()
            .body(Map.class);
        if (tokenResponse == null || tokenResponse.get("access_token") == null) {
            throw new IllegalStateException("MoMo token response missing access_token");
        }
        return String.valueOf(tokenResponse.get("access_token"));
    }

    private static String sanitizeMsisdn(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("250")) {
            return digits;
        }
        if (digits.startsWith("07") || digits.startsWith("08")) {
            return "250" + digits.substring(1);
        }
        return digits;
    }
}
