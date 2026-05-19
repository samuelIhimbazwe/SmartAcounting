package com.smartaccounting.controller;

import com.smartaccounting.tenant.TenantContext;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Mobile POS payment verification (USSD MoMo reference entry).
 */
@RestController
@RequestMapping("/api/v1/payments")
public class MobilePaymentController {

  @PostMapping("/momo/verify")
  public Map<String, Object> verifyMomo(@RequestBody Map<String, Object> body) {
    String code = String.valueOf(body.getOrDefault("transactionCode", "")).trim();
    String provider = String.valueOf(body.getOrDefault("provider", "MTN")).trim().toUpperCase();
    if (code.isBlank()) {
      return Map.of("status", "FAILED", "message", "Transaction code is required");
    }
    // MTN/Airtel API integration point — production uses operator verify APIs.
    boolean looksValid = code.length() >= 8 && code.matches("[A-Za-z0-9-]+");
    UUID tenant = TenantContext.tenantId();
    return Map.of(
        "status", looksValid ? "CONFIRMED" : "FAILED",
        "transactionCode", code,
        "provider", provider,
        "tenantId", tenant != null ? tenant.toString() : "",
        "amount", body.getOrDefault("amount", null),
        "message",
        looksValid
            ? "Payment reference accepted (stub verify — wire live operator API in production)."
            : "Invalid transaction code format"
    );
  }
}
