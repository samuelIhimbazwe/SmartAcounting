package com.smartaccounting.controller;

import com.smartaccounting.dto.PayrollRunDetail;
import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;
import com.smartaccounting.service.PayrollService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hr/payroll")
public class PayrollController {
    private final PayrollService payrollService;

    public PayrollController(PayrollService payrollService) {
        this.payrollService = payrollService;
    }

    @PostMapping("/runs")
    @PreAuthorize("hasAnyRole('CFO', 'HR_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<PayrollRun> prepareRun(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(payrollService.preparePayrollRun(
            body.get("period"), currentUserId()));
    }

    @GetMapping("/runs")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'HR_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<List<PayrollRun>> listRuns() {
        return ResponseEntity.ok(payrollService.listRuns());
    }

    @GetMapping("/runs/{runId}")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'HR_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<PayrollRunDetail> getRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.getRun(runId));
    }

    @PostMapping("/runs/{runId}/approve")
    @PreAuthorize("hasAnyRole('CEO', 'CFO')")
    public ResponseEntity<PayrollRun> approveRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.approvePayrollRun(runId, currentUserId()));
    }

    @PostMapping("/runs/{runId}/post")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<PayrollRun> postRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.postPayrollRun(runId));
    }

    @GetMapping("/runs/{runId}/lines")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'HR_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<List<PayrollLine>> getRunLines(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.getRunLines(runId));
    }

    @GetMapping("/runs/{runId}/payslip/{employeeId}")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'HR_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<byte[]> getPayslip(
        @PathVariable UUID runId,
        @PathVariable UUID employeeId) {
        return ResponseEntity.ok(payrollService.generatePayslip(runId, employeeId));
    }

    private UUID currentUserId() {
        return TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
    }
}
