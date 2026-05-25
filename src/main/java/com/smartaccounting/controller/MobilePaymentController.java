package com.smartaccounting.controller;

import com.smartaccounting.service.MomoStkService;
import com.smartaccounting.service.MomoVerifyService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Mobile POS payment verification (USSD MoMo reference entry).
 */
@RestController
@RequestMapping("/api/v1/payments")
public class MobilePaymentController {

    private final MomoVerifyService momoVerifyService;
    private final MomoStkService momoStkService;

    public MobilePaymentController(MomoVerifyService momoVerifyService, MomoStkService momoStkService) {
        this.momoVerifyService = momoVerifyService;
        this.momoStkService = momoStkService;
    }

    @PostMapping("/momo/verify")
    public Map<String, Object> verifyMomo(@RequestBody Map<String, Object> body) {
        String code = String.valueOf(body.getOrDefault("transactionCode", "")).trim();
        String provider = String.valueOf(body.getOrDefault("provider", "MTN")).trim().toUpperCase();
        BigDecimal amount = body.get("amount") instanceof Number n
            ? BigDecimal.valueOf(n.doubleValue())
            : BigDecimal.ZERO;
        Map<String, Object> result = momoVerifyService.verify(code, provider, amount);
        UUID tenant = TenantContext.tenantId();
        result = new java.util.LinkedHashMap<>(result);
        result.put("tenantId", tenant != null ? tenant.toString() : "");
        return result;
    }

    @PostMapping("/momo/stk-push")
    public ResponseEntity<Map<String, Object>> stkPush(@RequestBody Map<String, Object> body) {
        String phone = String.valueOf(body.getOrDefault("phoneNumber", "")).trim();
        String orderId = String.valueOf(body.getOrDefault("orderId", UUID.randomUUID())).trim();
        BigDecimal amount = body.get("amount") instanceof Number n
            ? BigDecimal.valueOf(n.doubleValue())
            : BigDecimal.ZERO;
        if (phone.isBlank() || amount.signum() <= 0) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false,
                "message", "phoneNumber and positive amount are required"));
        }
        Map<String, Object> result = momoStkService.initiateStkPush(phone, amount, orderId);
        return ResponseEntity.accepted().body(result);
    }
}
