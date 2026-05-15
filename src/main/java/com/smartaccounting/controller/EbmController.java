package com.smartaccounting.controller;

import com.smartaccounting.dto.EbmComplianceReport;
import com.smartaccounting.dto.EbmConfigRequest;
import com.smartaccounting.entity.EbmConfig;
import com.smartaccounting.entity.EbmReceipt;
import com.smartaccounting.service.EbmService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/compliance/ebm")
public class EbmController {
    private final EbmService ebmService;

    public EbmController(EbmService ebmService) {
        this.ebmService = ebmService;
    }

    @PostMapping("/config")
    @PreAuthorize("hasAnyRole('CEO', 'CFO')")
    public ResponseEntity<EbmConfig> saveConfig(@RequestBody @Valid EbmConfigRequest request) {
        return ResponseEntity.ok(ebmService.saveConfig(request));
    }

    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<EbmConfig> getConfig() {
        return ebmService.getConfig()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/report/{period}")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<EbmComplianceReport> getReport(@PathVariable String period) {
        return ResponseEntity.ok(ebmService.getComplianceReport(
            TenantContext.tenantId().toString(), period));
    }

    @GetMapping("/receipts")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<Page<EbmReceipt>> getReceipts(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ebmService.getReceipts(status, PageRequest.of(page, size)));
    }

    @PostMapping("/receipts/{receiptId}/retry")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<EbmReceipt> retryReceipt(@PathVariable UUID receiptId) {
        return ResponseEntity.ok(ebmService.retryReceipt(receiptId));
    }
}
