package com.smartaccounting.controller;

import com.smartaccounting.dto.JournalEntryWriteRequest;
import com.smartaccounting.service.FinanceService;
import com.smartaccounting.service.IdempotencyService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
public class FinanceController {
    private final FinanceService financeService;
    private final IdempotencyService idempotencyService;

    public FinanceController(FinanceService financeService, IdempotencyService idempotencyService) {
        this.financeService = financeService;
        this.idempotencyService = idempotencyService;
    }

    @GetMapping("/accounts")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public List<Map<String, Object>> listAccounts() {
        return financeService.listLedgerAccounts();
    }

    @GetMapping("/journal-entries")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public List<Map<String, Object>> listEntries(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        @RequestParam(required = false) String account,
        @RequestParam(required = false) String status
    ) {
        return financeService.listJournalEntries(fromDate, toDate, account, status);
    }

    @GetMapping("/journal-entries/next-reference")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, String> nextReference(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate entryDate
    ) {
        return Map.of("referenceNumber", financeService.previewNextReferenceNumber(entryDate));
    }

    @GetMapping("/journal-entries/{id}")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> getEntry(@PathVariable UUID id) {
        return financeService.getJournalEntry(id);
    }

    @PostMapping("/journal-entries")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> createEntry(@RequestBody @Valid JournalEntryWriteRequest request,
                                           HttpServletRequest httpRequest) {
        String key = requiredIdempotencyKey(httpRequest);
        Optional<Map<String, Object>> replay = idempotencyService.begin(
            TenantContext.tenantId(), "finance.journal-entry.create", key, request);
        if (replay.isPresent()) {
            return replay.get();
        }
        Map<String, Object> response = Map.of("journalEntryId", financeService.createJournalEntry(request));
        idempotencyService.complete(TenantContext.tenantId(), "finance.journal-entry.create", key, response);
        return response;
    }

    @PostMapping("/journal-entries/{id}/post")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> postEntry(@PathVariable UUID id) {
        return Map.of("journalEntryId", financeService.postJournalEntry(id));
    }

    @PostMapping("/journal-entries/{id}/reverse")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> reverseEntry(@PathVariable UUID id) {
        return Map.of("journalEntryId", financeService.reverseJournalEntry(id));
    }

    @PostMapping("/journal-entries/{id}/archive")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> archiveEntry(@PathVariable UUID id) {
        return Map.of("journalEntryId", financeService.archiveJournalEntry(id));
    }

    private String requiredIdempotencyKey(HttpServletRequest request) {
        String key = request.getHeader("Idempotency-Key");
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key header is required");
        }
        return key;
    }
}
