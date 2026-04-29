package com.smartchain.controller;

import com.smartchain.dto.CreateJournalEntryRequest;
import com.smartchain.service.FinanceService;
import com.smartchain.service.IdempotencyService;
import com.smartchain.tenant.TenantContext;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;
import java.util.Map;
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

    @PostMapping("/journal-entries")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> createEntry(@RequestBody @Valid CreateJournalEntryRequest request,
                                           HttpServletRequest httpRequest) {
        String key = requiredIdempotencyKey(httpRequest);
        Optional<Map<String, Object>> replay = idempotencyService.begin(TenantContext.tenantId(), "finance.journal-entry.create", key, request);
        if (replay.isPresent()) return replay.get();
        Map<String, Object> response = Map.of("journalEntryId", financeService.createJournalEntry(request));
        idempotencyService.complete(TenantContext.tenantId(), "finance.journal-entry.create", key, response);
        return response;
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
