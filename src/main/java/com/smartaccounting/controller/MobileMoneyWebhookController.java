package com.smartaccounting.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartaccounting.config.MobileMoneyProperties;
import com.smartaccounting.service.MobileMoneyIngressService;
import com.smartaccounting.service.MobileMoneyIngressService.IngressOutcome;
import com.smartaccounting.service.MobileMoneyReconciliationService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/integrations/mobile-money")
public class MobileMoneyWebhookController {

    private final MobileMoneyReconciliationService reconciliationService;
    private final MobileMoneyIngressService ingressService;
    private final MobileMoneyProperties mobileMoneyProperties;
    private final StringRedisTemplate redisTemplate;

    public MobileMoneyWebhookController(MobileMoneyReconciliationService reconciliationService,
                                        MobileMoneyIngressService ingressService,
                                        MobileMoneyProperties mobileMoneyProperties,
                                        StringRedisTemplate redisTemplate) {
        this.reconciliationService = reconciliationService;
        this.ingressService = ingressService;
        this.mobileMoneyProperties = mobileMoneyProperties;
        this.redisTemplate = redisTemplate;
    }

    /**
     * Accepts canonical JSON {@link MobileMoneyCallbackRequest} or provider-native MTN MoMo payload.
     * MTN often uses PUT for callbacks — both POST and PUT are accepted.
     */
    @RequestMapping(value = "/mtn/callback", method = {RequestMethod.POST, RequestMethod.PUT},
        consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> mtn(
        @RequestHeader(value = "X-Webhook-Token", required = false) String token,
        @RequestHeader(value = "X-Callback-Signature", required = false) String signature,
        @RequestBody JsonNode body,
        @RequestParam(value = "tenantId", required = false) UUID tenantId,
        jakarta.servlet.http.HttpServletRequest servletRequest
    ) {
        if (!ipAllowed(servletRequest, mobileMoneyProperties.getMtnAllowedIps())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return dispatch(MobileMoneyReconciliationService.PROVIDER_MTN, mobileMoneyProperties.getMtnWebhookSecret(), token, signature, body, tenantId);
    }

    /**
     * Accepts canonical JSON or provider-native Airtel Money payload.
     */
    @RequestMapping(value = "/airtel/callback", method = {RequestMethod.POST, RequestMethod.PUT},
        consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> airtel(
        @RequestHeader(value = "X-Webhook-Token", required = false) String token,
        @RequestBody JsonNode body,
        @RequestParam(value = "tenantId", required = false) UUID tenantId
    ) {
        return dispatch(MobileMoneyReconciliationService.PROVIDER_AIRTEL, mobileMoneyProperties.getAirtelWebhookSecret(), token, null, body, tenantId);
    }

    private ResponseEntity<Map<String, Object>> dispatch(String provider, String expectedSecret, String providedToken,
                                                          String signature, JsonNode body, UUID tenantQuery) {
        if (expectedSecret == null || expectedSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "MOBILE_MONEY_WEBHOOK_NOT_CONFIGURED", "provider", provider));
        }
        if (!secureTokenEquals(providedToken, expectedSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (signature != null && !verifyHmac(body.toString(), expectedSecret, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String txnId = body.path("transactionId").asText(body.path("externalId").asText(""));
        if (!txnId.isBlank() && isDuplicate(provider, txnId)) {
            return ResponseEntity.ok(Map.of("outcome", "DUPLICATE", "transactionId", txnId));
        }

        IngressOutcome parsed = ingressService.parse(provider, body, tenantQuery);
        if (parsed.skipped()) {
            return ResponseEntity.ok(Map.of(
                "outcome", "SKIPPED",
                "provider", provider,
                "reason", parsed.skipReason() != null ? parsed.skipReason() : ""
            ));
        }

        Map<String, Object> result = reconciliationService.settle(provider, parsed.request());
        if (!txnId.isBlank()) {
            markProcessed(provider, txnId);
        }
        return ResponseEntity.ok(result);
    }

    private boolean isDuplicate(String provider, String txnId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey("momo:processed:" + provider + ":" + txnId));
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private void markProcessed(String provider, String txnId) {
        try {
            redisTemplate.opsForValue().set("momo:processed:" + provider + ":" + txnId, "1", Duration.ofHours(24));
        } catch (RuntimeException ignored) {
        }
    }

    private static boolean ipAllowed(jakarta.servlet.http.HttpServletRequest request, String allowedCsv) {
        if (allowedCsv == null || allowedCsv.isBlank()) {
            return true;
        }
        Set<String> allowed = Arrays.stream(allowedCsv.split(",")).map(String::trim).filter(s -> !s.isBlank()).collect(Collectors.toSet());
        String ip = request.getRemoteAddr();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            ip = forwarded.split(",")[0].trim();
        }
        return allowed.contains(ip);
    }

    private static boolean verifyHmac(String payload, String secret, String provided) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), provided.trim().getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            return false;
        }
    }

    private static boolean secureTokenEquals(String provided, String expected) {
        if (provided == null) {
            return false;
        }
        byte[] a = provided.getBytes(StandardCharsets.UTF_8);
        byte[] b = expected.getBytes(StandardCharsets.UTF_8);
        if (a.length != b.length) {
            return false;
        }
        return MessageDigest.isEqual(a, b);
    }
}
