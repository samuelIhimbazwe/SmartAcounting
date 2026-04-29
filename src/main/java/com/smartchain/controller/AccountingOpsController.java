package com.smartchain.controller;

import com.smartchain.dto.CreatePaymentRequest;
import com.smartchain.dto.CreateReconciliationRequest;
import com.smartchain.service.IdempotencyService;
import com.smartchain.service.AccountingOpsService;
import com.smartchain.tenant.TenantContext;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounting")
public class AccountingOpsController {
    private final AccountingOpsService service;
    private final IdempotencyService idempotencyService;

    public AccountingOpsController(AccountingOpsService service, IdempotencyService idempotencyService) {
        this.service = service;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping("/payments")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> createPayment(@RequestBody @Valid CreatePaymentRequest request,
                                             HttpServletRequest httpRequest) {
        String key = requiredIdempotencyKey(httpRequest);
        Optional<Map<String, Object>> replay = idempotencyService.begin(TenantContext.tenantId(), "accounting.payments.create", key, request);
        if (replay.isPresent()) return replay.get();
        Map<String, Object> response = Map.of("paymentId", service.createPayment(request));
        idempotencyService.complete(TenantContext.tenantId(), "accounting.payments.create", key, response);
        return response;
    }

    @PostMapping("/reconciliations")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> createReconciliation(@RequestBody @Valid CreateReconciliationRequest request) {
        return Map.of("reconciliationId", service.createReconciliation(request));
    }

    private String requiredIdempotencyKey(HttpServletRequest request) {
        String key = request.getHeader("Idempotency-Key");
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key header is required");
        }
        return key;
    }
}
