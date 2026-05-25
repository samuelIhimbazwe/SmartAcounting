package com.smartaccounting.controller;

import com.smartaccounting.dto.EbmComplianceReport;
import com.smartaccounting.dto.EbmConfigRequest;
import com.smartaccounting.dto.MobileEfdSubmitRequest;
import com.smartaccounting.entity.EbmConfig;
import com.smartaccounting.entity.EbmReceipt;
import com.smartaccounting.service.EbmService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/compliance/ebm")
public class EbmController {
    private final EbmService ebmService;

    public EbmController(EbmService ebmService) {
        this.ebmService = ebmService;
    }

    @PostMapping("/config")
    @PreAuthorize(PermissionExpressions.EBM_CONFIG)
    public ResponseEntity<EbmConfig> saveConfig(@RequestBody @Valid EbmConfigRequest request) {
        return ResponseEntity.ok(ebmService.saveConfig(request));
    }

    @GetMapping("/config")
    @PreAuthorize(PermissionExpressions.EBM_CONFIG)
    public ResponseEntity<EbmConfig> getConfig() {
        return ebmService.getConfig()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/report/{period}")
    @PreAuthorize(PermissionExpressions.EBM_CONFIG)
    public ResponseEntity<EbmComplianceReport> getReport(@PathVariable String period) {
        return ResponseEntity.ok(ebmService.getComplianceReport(
            TenantContext.tenantId().toString(), period));
    }

    @GetMapping("/receipts")
    @PreAuthorize(PermissionExpressions.EBM_AUDIT)
    public ResponseEntity<Page<EbmReceipt>> getReceipts(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ebmService.getReceipts(status, PageRequest.of(page, size)));
    }

    @PostMapping("/receipts/{receiptId}/retry")
    @PreAuthorize(PermissionExpressions.EBM_AUDIT)
    public ResponseEntity<EbmReceipt> retryReceipt(@PathVariable UUID receiptId) {
        return ResponseEntity.ok(ebmService.retryReceipt(receiptId));
    }

    /** Mobile POS fiscal submit — returns signature + QR (live when EBM config is active). */
    @PostMapping("/receipts/submit")
    @PreAuthorize(PermissionExpressions.POS_ACCESS)
    public ResponseEntity<Map<String, String>> submitMobileReceipt(
            @RequestBody @Valid MobileEfdSubmitRequest request) {
        return ResponseEntity.ok(ebmService.submitSaleForMobile(
            request.salesOrderId(),
            request.grossAmount(),
            request.vatAmount(),
            request.currencyCode()));
    }

    /** Pre-go-live: reports mock vs live EBM without submitting a receipt. */
    @GetMapping("/test")
    @PreAuthorize(PermissionExpressions.EBM_CONFIG)
    public ResponseEntity<Map<String, Object>> integrationTest() {
        return ebmService.getConfig()
            .map(cfg -> ResponseEntity.ok(Map.<String, Object>of(
                "configured", true,
                "active", cfg.isActive(),
                "mode", cfg.isActive() ? "live" : "inactive",
                "tin", cfg.getEbmTin() != null ? cfg.getEbmTin() : "")))
            .orElse(ResponseEntity.ok(Map.of(
                "configured", false,
                "active", false,
                "mode", "mock",
                "message", "EBM not configured — mobile uses mock/HMAC signing")));
    }
}
