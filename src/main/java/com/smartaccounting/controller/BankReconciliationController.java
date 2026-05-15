package com.smartaccounting.controller;

import com.smartaccounting.dto.BankAccountRequest;
import com.smartaccounting.dto.BankReconciliationSummary;
import com.smartaccounting.entity.BankAccount;
import com.smartaccounting.entity.BankStatementImport;
import com.smartaccounting.entity.BankStatementLine;
import com.smartaccounting.service.BankReconciliationService;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/bank-accounts")
public class BankReconciliationController {
    private final BankReconciliationService bankReconciliationService;

    public BankReconciliationController(BankReconciliationService bankReconciliationService) {
        this.bankReconciliationService = bankReconciliationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<BankAccount> createBankAccount(@RequestBody @Valid BankAccountRequest request) {
        return ResponseEntity.ok(bankReconciliationService.createBankAccount(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<List<BankAccount>> listBankAccounts() {
        return ResponseEntity.ok(bankReconciliationService.listBankAccounts());
    }

    @PostMapping("/{accountId}/import")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<BankStatementImport> importStatement(
        @PathVariable UUID accountId,
        @RequestParam("file") MultipartFile file) throws IOException {
        UUID importedBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(bankReconciliationService.importStatement(accountId, file, importedBy));
    }

    @GetMapping("/{accountId}/unmatched")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<Page<BankStatementLine>> getUnmatched(
        @PathVariable UUID accountId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(bankReconciliationService.getUnmatched(accountId, PageRequest.of(page, size)));
    }

    @PostMapping("/{accountId}/lines/{lineId}/match")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<Void> confirmMatch(
        @PathVariable UUID accountId,
        @PathVariable UUID lineId,
        @RequestBody Map<String, UUID> body) {
        bankReconciliationService.confirmMatch(lineId, body.get("journalEntryId"));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{accountId}/lines/{lineId}/bank-charge")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<Void> postBankCharge(
        @PathVariable UUID accountId,
        @PathVariable UUID lineId,
        @RequestBody(required = false) Map<String, String> body) {
        String description = body != null ? body.get("description") : null;
        bankReconciliationService.postBankCharge(lineId, description);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{accountId}/summary")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<BankReconciliationSummary> getSummary(@PathVariable UUID accountId) {
        return ResponseEntity.ok(bankReconciliationService.getSummary(accountId));
    }

    @GetMapping("/{accountId}/imports")
    @PreAuthorize("hasAnyRole('CFO', 'ACCOUNTING_CONTROLLER')")
    public ResponseEntity<List<BankStatementImport>> getImportHistory(@PathVariable UUID accountId) {
        return ResponseEntity.ok(bankReconciliationService.getImportHistory(accountId));
    }
}
