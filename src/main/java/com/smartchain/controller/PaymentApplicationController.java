package com.smartchain.controller;

import com.smartchain.dto.ApplyPaymentRequest;
import com.smartchain.service.IdempotencyService;
import com.smartchain.service.PaymentApplicationService;
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
public class PaymentApplicationController {
    private final PaymentApplicationService service;
    private final IdempotencyService idempotencyService;

    public PaymentApplicationController(PaymentApplicationService service, IdempotencyService idempotencyService) {
        this.service = service;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping("/payments/apply")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> apply(@RequestBody @Valid ApplyPaymentRequest request,
                                     HttpServletRequest httpRequest) {
        String key = requiredIdempotencyKey(httpRequest);
        Optional<Map<String, Object>> replay = idempotencyService.begin(TenantContext.tenantId(), "accounting.payments.apply", key, request);
        if (replay.isPresent()) return replay.get();
        Map<String, Object> response = Map.of("applicationId", service.apply(request));
        idempotencyService.complete(TenantContext.tenantId(), "accounting.payments.apply", key, response);
        return response;
    }

    private String requiredIdempotencyKey(HttpServletRequest request) {
        String key = request.getHeader("Idempotency-Key");
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key header is required");
        }
        return key;
    }
}
