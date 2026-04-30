package com.smartchain.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.CreateJournalEntryRequest;
import com.smartchain.entity.JournalEntry;
import com.smartchain.events.DomainEventPublisher;
import com.smartchain.repository.JournalEntryRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class FinanceService {
    private final JournalEntryRepository journalEntryRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final DomainEventPublisher eventPublisher;

    public FinanceService(JournalEntryRepository journalEntryRepository,
                          AuditService auditService,
                          ObjectMapper objectMapper,
                          DomainEventPublisher eventPublisher) {
        this.journalEntryRepository = journalEntryRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public UUID createJournalEntry(CreateJournalEntryRequest request) {
        UUID tenantId = requireTenant();
        JournalEntry entry = new JournalEntry();
        entry.setId(UUID.randomUUID());
        entry.setTenantId(tenantId);
        entry.setEntryDate(request.entryDate());
        entry.setDescription(request.description());
        entry.setDebitAccount(request.debitAccount());
        entry.setCreditAccount(request.creditAccount());
        entry.setAmount(request.amount());
        entry.setCurrencyCode(request.currencyCode());
        entry.setCreatedAt(Instant.now());
        journalEntryRepository.save(entry);
        eventPublisher.publish("finance.events", "JOURNAL_ENTRY_CREATED", Map.of(
            "id", entry.getId(),
            "amount", entry.getAmount(),
            "currencyCode", entry.getCurrencyCode()
        ));
        auditService.logAction("LEDGER_ENTRY_CREATED", "JOURNAL_ENTRY", "{}", toJson(Map.of("id", entry.getId())));
        return entry.getId();
    }

    @Transactional
    public UUID archiveJournalEntry(UUID entryId) {
        JournalEntry entry = journalEntryRepository.findByIdAndDeletedAtIsNull(entryId)
            .orElseThrow(() -> new IllegalArgumentException("Journal entry not found"));
        entry.setDeletedAt(Instant.now());
        journalEntryRepository.save(entry);
        auditService.logAction("LEDGER_ENTRY_ARCHIVED", "JOURNAL_ENTRY", "{}", toJson(Map.of("id", entryId)));
        return entry.getId();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JSON serialization failed", e);
        }
    }
}
