package com.smartaccounting.controller;

import com.smartaccounting.dto.CreatePaymentRunRequest;
import com.smartaccounting.dto.PaymentRunDetail;
import com.smartaccounting.entity.PaymentRun;
import com.smartaccounting.service.PaymentRunService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/payment-runs")
public class PaymentRunController {
    private final PaymentRunService paymentRunService;

    public PaymentRunController(PaymentRunService paymentRunService) {
        this.paymentRunService = paymentRunService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<PaymentRun> createRun(@RequestBody @Valid CreatePaymentRunRequest request) {
        UUID createdBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(paymentRunService.createPaymentRun(request, createdBy));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<List<PaymentRun>> listRuns() {
        return ResponseEntity.ok(paymentRunService.listRuns());
    }

    @GetMapping("/{runId}")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<PaymentRunDetail> getRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(paymentRunService.getRunDetail(runId));
    }

    @PostMapping("/{runId}/approve")
    @PreAuthorize("hasAnyRole('CEO', 'CFO')")
    public ResponseEntity<PaymentRun> approveRun(@PathVariable UUID runId) {
        UUID approvedBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(paymentRunService.approvePaymentRun(runId, approvedBy));
    }

    @PostMapping("/{runId}/execute")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<PaymentRun> executeRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(paymentRunService.executePaymentRun(runId));
    }
}
