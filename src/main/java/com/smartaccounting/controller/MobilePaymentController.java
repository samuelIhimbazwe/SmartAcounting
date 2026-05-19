package com.smartaccounting.controller;

import com.smartaccounting.service.MomoVerifyService;
import com.smartaccounting.tenant.TenantContext;
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

    public MobilePaymentController(MomoVerifyService momoVerifyService) {
        this.momoVerifyService = momoVerifyService;
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
}
