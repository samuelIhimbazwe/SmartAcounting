package com.smartaccounting.controller;

import com.smartaccounting.dto.PayrollRunDetail;
import com.smartaccounting.entity.PayrollLine;
import com.smartaccounting.entity.PayrollRun;
import com.smartaccounting.compliance.PayrollFilingService;
import com.smartaccounting.service.PayrollService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/v1/hr/payroll")
public class PayrollController {
    private final PayrollService payrollService;
    private final PayrollFilingService payrollFilingService;

    public PayrollController(PayrollService payrollService, PayrollFilingService payrollFilingService) {
        this.payrollService = payrollService;
        this.payrollFilingService = payrollFilingService;
    }

    @PostMapping("/runs")
    @PreAuthorize(PermissionExpressions.PAYROLL_WRITE)
    public ResponseEntity<PayrollRun> prepareRun(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(payrollService.preparePayrollRun(
            body.get("period"), currentUserId()));
    }

    @GetMapping("/runs")
    @PreAuthorize(PermissionExpressions.PAYROLL_READ)
    public ResponseEntity<List<PayrollRun>> listRuns() {
        return ResponseEntity.ok(payrollService.listRuns());
    }

    @GetMapping("/runs/{runId}")
    @PreAuthorize(PermissionExpressions.PAYROLL_READ)
    public ResponseEntity<PayrollRunDetail> getRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.getRun(runId));
    }

    @PostMapping("/runs/{runId}/approve")
    @PreAuthorize(PermissionExpressions.PAYROLL_WRITE)
    public ResponseEntity<PayrollRun> approveRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.approvePayrollRun(runId, currentUserId()));
    }

    @PostMapping("/runs/{runId}/post")
    @PreAuthorize(PermissionExpressions.PAYROLL_WRITE)
    public ResponseEntity<PayrollRun> postRun(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.postPayrollRun(runId));
    }

    @GetMapping("/runs/{runId}/lines")
    @PreAuthorize(PermissionExpressions.PAYROLL_READ)
    public ResponseEntity<List<PayrollLine>> getRunLines(@PathVariable UUID runId) {
        return ResponseEntity.ok(payrollService.getRunLines(runId));
    }

    @GetMapping("/runs/{runId}/payslip/{employeeId}")
    @PreAuthorize(PermissionExpressions.PAYROLL_READ)
    public ResponseEntity<byte[]> getPayslip(
        @PathVariable UUID runId,
        @PathVariable UUID employeeId) {
        byte[] pdf = payrollService.generatePayslip(runId, employeeId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"payslip-" + runId + "-" + employeeId + ".pdf\"")
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    @GetMapping("/runs/{runId}/payslips")
    @PreAuthorize(PermissionExpressions.PAYROLL_READ)
    public ResponseEntity<byte[]> downloadAllPayslips(@PathVariable UUID runId) throws IOException {
        List<PayrollLine> lines = payrollService.getRunLines(runId);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(baos)) {
            for (PayrollLine line : lines) {
                zip.putNextEntry(new ZipEntry("payslip-" + line.getEmployeeId() + ".pdf"));
                zip.write(payrollService.generatePayslip(runId, line.getEmployeeId()));
                zip.closeEntry();
            }
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"payslips-" + runId + ".zip\"")
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .contentType(MediaType.parseMediaType("application/zip"))
            .body(baos.toByteArray());
    }

    @GetMapping("/runs/{runId}/paye-export")
    @PreAuthorize(PermissionExpressions.PAYROLL_READ)
    public ResponseEntity<byte[]> payeExport(@PathVariable UUID runId) {
        byte[] csv = payrollFilingService.exportPayeCsv(runId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=paye-" + runId + ".csv")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(csv);
    }

    private UUID currentUserId() {
        return TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
    }
}
