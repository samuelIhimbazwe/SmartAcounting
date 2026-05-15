package com.smartaccounting.controller;

import com.smartaccounting.compliance.rwanda.RraCloseTaxTaskSeeder;
import com.smartaccounting.compliance.rwanda.RraEisInvoiceService;
import com.smartaccounting.compliance.rwanda.RraMultiTaxFilingService;
import com.smartaccounting.compliance.rwanda.RraRwandaSettingsService;
import com.smartaccounting.dto.UpdateRraRwandaSettingsRequest;
import com.smartaccounting.entity.RraEisSubmission;
import com.smartaccounting.entity.RraRwandaSettings;
import com.smartaccounting.entity.RraTaxFiling;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Rwanda Revenue Authority (RRA) Electronic Invoicing System (EIS) hooks, VAT automation, and multi-tax filing drafts.
 */
@RestController
@RequestMapping("/api/v1/compliance/rwanda")
public class RwandaComplianceController {
    private final RraRwandaSettingsService settingsService;
    private final RraEisInvoiceService eisInvoiceService;
    private final RraMultiTaxFilingService filingService;
    private final RraCloseTaxTaskSeeder closeTaxTaskSeeder;

    public RwandaComplianceController(RraRwandaSettingsService settingsService,
                                      RraEisInvoiceService eisInvoiceService,
                                      RraMultiTaxFilingService filingService,
                                      RraCloseTaxTaskSeeder closeTaxTaskSeeder) {
        this.settingsService = settingsService;
        this.eisInvoiceService = eisInvoiceService;
        this.filingService = filingService;
        this.closeTaxTaskSeeder = closeTaxTaskSeeder;
    }

    @GetMapping("/settings")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_READ')")
    public ResponseEntity<RraRwandaSettings> getSettings() {
        return settingsService.current().map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/settings")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public RraRwandaSettings putSettings(@RequestBody @Valid UpdateRraRwandaSettingsRequest body) {
        return settingsService.upsert(body);
    }

    @GetMapping("/hints")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_READ')")
    public Map<String, Object> hints() {
        return settingsService.complianceHints();
    }

    @PostMapping("/eis/invoices/{invoiceId}/submit")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public RraEisSubmission submitInvoice(@PathVariable UUID invoiceId) throws Exception {
        return eisInvoiceService.submit(invoiceId);
    }

    @PostMapping("/vat/returns/{period}/refresh")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public List<RraTaxFiling> refreshVat(@PathVariable String period) throws Exception {
        return filingService.refreshDrafts(period);
    }

    @PostMapping("/vat/returns/{period}/submit")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public RraTaxFiling submitVat(@PathVariable String period) throws Exception {
        return filingService.submitVatReturn(period);
    }

    @GetMapping("/filings")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_READ')")
    public List<RraTaxFiling> filings(@RequestParam String period) {
        return filingService.list(period);
    }

    @PostMapping("/close/{period}/seed-tax-tasks")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> seedCloseTax(@PathVariable String period) {
        return closeTaxTaskSeeder.seedTaxTasks(period);
    }
}
