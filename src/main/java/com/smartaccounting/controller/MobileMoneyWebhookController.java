package com.smartaccounting.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartaccounting.config.MobileMoneyProperties;
import com.smartaccounting.service.MobileMoneyIngressService;
import com.smartaccounting.service.MobileMoneyIngressService.IngressOutcome;
import com.smartaccounting.service.MobileMoneyReconciliationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/integrations/mobile-money")
public class MobileMoneyWebhookController {

    private final MobileMoneyReconciliationService reconciliationService;
    private final MobileMoneyIngressService ingressService;
    private final MobileMoneyProperties mobileMoneyProperties;

    public MobileMoneyWebhookController(MobileMoneyReconciliationService reconciliationService,
                                        MobileMoneyIngressService ingressService,
                                        MobileMoneyProperties mobileMoneyProperties) {
        this.reconciliationService = reconciliationService;
        this.ingressService = ingressService;
        this.mobileMoneyProperties = mobileMoneyProperties;
    }

    /**
     * Accepts canonical JSON {@link MobileMoneyCallbackRequest} or provider-native MTN MoMo payload.
     * MTN often uses PUT for callbacks — both POST and PUT are accepted.
     */
    @RequestMapping(value = "/mtn/callback", method = {RequestMethod.POST, RequestMethod.PUT},
        consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> mtn(
        @RequestHeader(value = "X-Webhook-Token", required = false) String token,
        @RequestBody JsonNode body,
        @RequestParam(value = "tenantId", required = false) UUID tenantId
    ) {
        return dispatch(MobileMoneyReconciliationService.PROVIDER_MTN, mobileMoneyProperties.getMtnWebhookSecret(), token, body, tenantId);
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
        return dispatch(MobileMoneyReconciliationService.PROVIDER_AIRTEL, mobileMoneyProperties.getAirtelWebhookSecret(), token, body, tenantId);
    }

    private ResponseEntity<Map<String, Object>> dispatch(String provider, String expectedSecret, String providedToken,
                                                          JsonNode body, UUID tenantQuery) {
        if (expectedSecret == null || expectedSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "MOBILE_MONEY_WEBHOOK_NOT_CONFIGURED", "provider", provider));
        }
        if (!secureTokenEquals(providedToken, expectedSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
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
        return ResponseEntity.ok(result);
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
