package com.smartaccounting.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreateJournalEntryRequest;
import com.smartaccounting.dto.JournalEntryWriteRequest;
import com.smartaccounting.dto.JournalLineWrite;
import com.smartaccounting.entity.JournalEntry;
import com.smartaccounting.entity.LedgerAccount;
import com.smartaccounting.entity.User;
import com.smartaccounting.events.DomainEventPublisher;
import com.smartaccounting.repository.JournalEntryRepository;
import com.smartaccounting.repository.LedgerAccountRepository;
import com.smartaccounting.repository.UserRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FinanceService {
    private static final TypeReference<List<Map<String, Object>>> LINES_TYPE = new TypeReference<>() {};
    private static final List<String[]> DEFAULT_ACCOUNTS = List.of(
        new String[] {"1010-CASH", "Cash on hand", "ASSET"},
        new String[] {"1020-BANK-MOMO", "Mobile money bank", "ASSET"},
        new String[] {"1030-AR-CTRL", "Accounts receivable control", "ASSET"},
        new String[] {"1100-AR", "Accounts receivable", "ASSET"},
        new String[] {"1300-INVENTORY", "Inventory", "ASSET"},
        new String[] {"1500-ACC-DEP", "Accumulated depreciation", "ASSET"},
        new String[] {"2000-AP", "Accounts payable", "LIABILITY"},
        new String[] {"4000-SALES", "Sales revenue", "REVENUE"},
        new String[] {"5100-PAYROLL", "Payroll expense", "EXPENSE"},
        new String[] {"5400-DEPREC", "Depreciation expense", "EXPENSE"}
    );

    private final JournalEntryRepository journalEntryRepository;
    private final LedgerAccountRepository ledgerAccountRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final DomainEventPublisher eventPublisher;

    public FinanceService(JournalEntryRepository journalEntryRepository,
                          LedgerAccountRepository ledgerAccountRepository,
                          UserRepository userRepository,
                          AuditService auditService,
                          ObjectMapper objectMapper,
                          DomainEventPublisher eventPublisher) {
        this.journalEntryRepository = journalEntryRepository;
        this.ledgerAccountRepository = ledgerAccountRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
    }

    public List<Map<String, Object>> listLedgerAccounts() {
        UUID tenantId = requireTenant();
        ensureDefaultChartOfAccounts(tenantId);
        return ledgerAccountRepository.findByTenantIdAndActiveTrueOrderByAccountCodeAsc(tenantId).stream()
            .map(this::toAccountView)
            .toList();
    }

    public List<Map<String, Object>> listJournalEntries(LocalDate fromDate, LocalDate toDate, String account, String status) {
        UUID tenantId = requireTenant();
        String normalizedStatus = blankToNull(status);
        String normalizedAccount = blankToNull(account);
        return journalEntryRepository.findByTenantIdAndDeletedAtIsNullOrderByEntryDateDescCreatedAtDesc(tenantId).stream()
            .filter(entry -> fromDate == null || !entry.getEntryDate().isBefore(fromDate))
            .filter(entry -> toDate == null || !entry.getEntryDate().isAfter(toDate))
            .filter(entry -> normalizedStatus == null || normalizedStatus.equalsIgnoreCase(entry.getStatus()))
            .filter(entry -> normalizedAccount == null || entryUsesAccount(entry, normalizedAccount))
            .map(this::toSummary)
            .toList();
    }

    public Map<String, Object> getJournalEntry(UUID entryId) {
        JournalEntry entry = requireEntry(entryId);
        return toDetail(entry);
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
        entry.setReferenceNumber(nextReferenceNumber(tenantId, request.entryDate()));
        entry.setStatus("POSTED");
        entry.setPostedAt(Instant.now());
        entry.setPostedBy(TenantContext.userId());
        entry.setLinesJson(toJson(legacyLines(request.debitAccount(), request.creditAccount(), request.amount(), request.description())));
        journalEntryRepository.save(entry);
        publishCreated(entry);
        auditService.logAction("LEDGER_ENTRY_CREATED", "JOURNAL_ENTRY", "{}", toJson(Map.of("id", entry.getId())));
        return entry.getId();
    }

    @Transactional
    public UUID createJournalEntry(JournalEntryWriteRequest request) {
        UUID tenantId = requireTenant();
        List<Map<String, Object>> lines = normalizeLines(request.lines());
        Totals totals = totalsFor(lines);
        if (request.post() && !totals.balanced()) {
            throw new IllegalArgumentException("Debits must equal credits before posting");
        }
        JournalEntry entry = new JournalEntry();
        entry.setId(UUID.randomUUID());
        entry.setTenantId(tenantId);
        entry.setEntryDate(request.entryDate());
        entry.setDescription(request.description());
        entry.setCurrencyCode(request.currencyCode());
        entry.setCreatedAt(Instant.now());
        entry.setReferenceNumber(blankToNull(request.referenceNumber()) != null
            ? request.referenceNumber().trim()
            : nextReferenceNumber(tenantId, request.entryDate()));
        entry.setLinesJson(toJson(lines));
        applyLegacyColumns(entry, lines, totals);
        if (request.post()) {
            markPosted(entry);
        } else {
            entry.setStatus("DRAFT");
        }
        journalEntryRepository.save(entry);
        publishCreated(entry);
        auditService.logAction("LEDGER_ENTRY_CREATED", "JOURNAL_ENTRY", "{}", toJson(Map.of("id", entry.getId(), "status", entry.getStatus())));
        return entry.getId();
    }

    @Transactional
    public UUID postJournalEntry(UUID entryId) {
        JournalEntry entry = requireEntry(entryId);
        if (!"DRAFT".equalsIgnoreCase(entry.getStatus())) {
            throw new IllegalArgumentException("Only draft journal entries can be posted");
        }
        Totals totals = totalsFor(parseLines(entry));
        if (!totals.balanced()) {
            throw new IllegalArgumentException("Debits must equal credits before posting");
        }
        markPosted(entry);
        journalEntryRepository.save(entry);
        auditService.logAction("LEDGER_ENTRY_POSTED", "JOURNAL_ENTRY", "{}", toJson(Map.of("id", entryId)));
        return entry.getId();
    }

    @Transactional
    public UUID reverseJournalEntry(UUID entryId) {
        JournalEntry source = requireEntry(entryId);
        if (!"POSTED".equalsIgnoreCase(source.getStatus())) {
            throw new IllegalArgumentException("Only posted journal entries can be reversed");
        }
        if (source.getReversedFromId() != null) {
            throw new IllegalArgumentException("Reversal entries cannot be reversed again");
        }
        List<Map<String, Object>> sourceLines = parseLines(source);
        List<Map<String, Object>> reversedLines = sourceLines.stream()
            .map(this::flipLine)
            .toList();
        Totals totals = totalsFor(reversedLines);

        UUID tenantId = requireTenant();
        JournalEntry reversal = new JournalEntry();
        reversal.setId(UUID.randomUUID());
        reversal.setTenantId(tenantId);
        reversal.setEntryDate(LocalDate.now());
        reversal.setDescription("Reversal of " + source.getReferenceNumber() + ": " + source.getDescription());
        reversal.setCurrencyCode(source.getCurrencyCode());
        reversal.setCreatedAt(Instant.now());
        reversal.setReferenceNumber("REV-" + source.getReferenceNumber());
        reversal.setLinesJson(toJson(reversedLines));
        reversal.setReversedFromId(source.getId());
        applyLegacyColumns(reversal, reversedLines, totals);
        markPosted(reversal);
        journalEntryRepository.save(reversal);

        source.setStatus("REVERSED");
        journalEntryRepository.save(source);

        auditService.logAction("LEDGER_ENTRY_REVERSED", "JOURNAL_ENTRY", "{}", toJson(Map.of(
            "sourceId", source.getId(),
            "reversalId", reversal.getId()
        )));
        return reversal.getId();
    }

    @Transactional
    public UUID archiveJournalEntry(UUID entryId) {
        JournalEntry entry = requireEntry(entryId);
        entry.setDeletedAt(Instant.now());
        journalEntryRepository.save(entry);
        auditService.logAction("LEDGER_ENTRY_ARCHIVED", "JOURNAL_ENTRY", "{}", toJson(Map.of("id", entryId)));
        return entry.getId();
    }

    public String previewNextReferenceNumber(LocalDate entryDate) {
        return nextReferenceNumber(requireTenant(), entryDate == null ? LocalDate.now() : entryDate);
    }

    private JournalEntry requireEntry(UUID entryId) {
        JournalEntry entry = journalEntryRepository.findByIdAndDeletedAtIsNull(entryId)
            .orElseThrow(() -> new IllegalArgumentException("Journal entry not found"));
        if (!requireTenant().equals(entry.getTenantId())) {
            throw new IllegalArgumentException("Journal entry not found");
        }
        return entry;
    }

    private void markPosted(JournalEntry entry) {
        entry.setStatus("POSTED");
        entry.setPostedAt(Instant.now());
        entry.setPostedBy(TenantContext.userId());
    }

    private void applyLegacyColumns(JournalEntry entry, List<Map<String, Object>> lines, Totals totals) {
        Map<String, Object> firstDebit = lines.stream()
            .filter(line -> decimal(line.get("debit")).compareTo(BigDecimal.ZERO) > 0)
            .findFirst()
            .orElse(lines.get(0));
        Map<String, Object> firstCredit = lines.stream()
            .filter(line -> decimal(line.get("credit")).compareTo(BigDecimal.ZERO) > 0)
            .findFirst()
            .orElse(lines.size() > 1 ? lines.get(1) : lines.get(0));
        entry.setDebitAccount(String.valueOf(firstDebit.get("account")));
        entry.setCreditAccount(String.valueOf(firstCredit.get("account")));
        entry.setAmount(totals.debitTotal());
    }

    private Map<String, Object> flipLine(Map<String, Object> line) {
        Map<String, Object> flipped = new LinkedHashMap<>(line);
        BigDecimal debit = decimal(line.get("debit"));
        BigDecimal credit = decimal(line.get("credit"));
        flipped.put("debit", credit);
        flipped.put("credit", debit);
        return flipped;
    }

    private Map<String, Object> toSummary(JournalEntry entry) {
        Totals totals = totalsFor(parseLines(entry));
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", entry.getId());
        row.put("entryDate", entry.getEntryDate());
        row.put("referenceNumber", entry.getReferenceNumber());
        row.put("description", entry.getDescription());
        row.put("debitTotal", totals.debitTotal());
        row.put("creditTotal", totals.creditTotal());
        row.put("status", entry.getStatus());
        row.put("currencyCode", entry.getCurrencyCode());
        row.put("postedBy", resolvePostedBy(entry.getPostedBy()));
        row.put("postedAt", entry.getPostedAt());
        return row;
    }

    private Map<String, Object> toDetail(JournalEntry entry) {
        Map<String, Object> detail = new LinkedHashMap<>(toSummary(entry));
        detail.put("lines", parseLines(entry).stream().map(this::normalizeLineView).toList());
        detail.put("reversedFromId", entry.getReversedFromId());
        return detail;
    }

    private Map<String, Object> normalizeLineView(Map<String, Object> line) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("account", line.get("account"));
        view.put("description", line.get("description"));
        view.put("debit", decimal(line.get("debit")));
        view.put("credit", decimal(line.get("credit")));
        return view;
    }

    private String resolvePostedBy(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId).map(User::getUsername).orElse(userId.toString());
    }

    private boolean entryUsesAccount(JournalEntry entry, String account) {
        if (account.equalsIgnoreCase(entry.getDebitAccount()) || account.equalsIgnoreCase(entry.getCreditAccount())) {
            return true;
        }
        return parseLines(entry).stream()
            .anyMatch(line -> account.equalsIgnoreCase(String.valueOf(line.get("account"))));
    }

    private List<Map<String, Object>> normalizeLines(List<JournalLineWrite> lines) {
        UUID tenantId = requireTenant();
        ensureDefaultChartOfAccounts(tenantId);
        if (lines == null || lines.isEmpty()) {
            throw new IllegalArgumentException("At least one journal line is required");
        }
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (JournalLineWrite line : lines) {
            BigDecimal debit = scale(line.debit());
            BigDecimal credit = scale(line.credit());
            if (debit.compareTo(BigDecimal.ZERO) == 0 && credit.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            if (debit.compareTo(BigDecimal.ZERO) > 0 && credit.compareTo(BigDecimal.ZERO) > 0) {
                throw new IllegalArgumentException("Each line must have either a debit or a credit amount");
            }
            String accountCode = line.account().trim();
            if (ledgerAccountRepository.findByTenantIdAndAccountCodeIgnoreCase(tenantId, accountCode).isEmpty()) {
                throw new IllegalArgumentException("Unknown account code: " + accountCode);
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("account", accountCode);
            row.put("description", line.description() == null ? "" : line.description().trim());
            row.put("debit", debit);
            row.put("credit", credit);
            normalized.add(row);
        }
        if (normalized.size() < 2) {
            throw new IllegalArgumentException("At least two non-zero journal lines are required");
        }
        return normalized;
    }

    @Transactional
    void ensureDefaultChartOfAccounts(UUID tenantId) {
        if (ledgerAccountRepository.countByTenantId(tenantId) > 0) {
            return;
        }
        Instant now = Instant.now();
        for (String[] account : DEFAULT_ACCOUNTS) {
            LedgerAccount row = new LedgerAccount();
            row.setId(UUID.randomUUID());
            row.setTenantId(tenantId);
            row.setAccountCode(account[0]);
            row.setAccountName(account[1]);
            row.setAccountType(account[2]);
            row.setActive(true);
            row.setCreatedAt(now);
            ledgerAccountRepository.save(row);
        }
    }

    private Map<String, Object> toAccountView(LedgerAccount account) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("accountCode", account.getAccountCode());
        view.put("accountName", account.getAccountName());
        view.put("accountType", account.getAccountType());
        return view;
    }

    private List<Map<String, Object>> legacyLines(String debitAccount, String creditAccount, BigDecimal amount, String description) {
        List<Map<String, Object>> lines = new ArrayList<>();
        Map<String, Object> debitLine = new LinkedHashMap<>();
        debitLine.put("account", debitAccount);
        debitLine.put("description", description == null ? "" : description);
        debitLine.put("debit", scale(amount));
        debitLine.put("credit", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        lines.add(debitLine);
        Map<String, Object> creditLine = new LinkedHashMap<>();
        creditLine.put("account", creditAccount);
        creditLine.put("description", description == null ? "" : description);
        creditLine.put("debit", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        creditLine.put("credit", scale(amount));
        lines.add(creditLine);
        return lines;
    }

    private List<Map<String, Object>> parseLines(JournalEntry entry) {
        if (entry.getLinesJson() != null && !entry.getLinesJson().isBlank()) {
            try {
                return objectMapper.readValue(entry.getLinesJson(), LINES_TYPE);
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Failed to parse journal lines", e);
            }
        }
        if (entry.getDebitAccount() != null && entry.getCreditAccount() != null && entry.getAmount() != null) {
            return legacyLines(entry.getDebitAccount(), entry.getCreditAccount(), entry.getAmount(), entry.getDescription());
        }
        return List.of();
    }

    private Totals totalsFor(List<Map<String, Object>> lines) {
        BigDecimal debitTotal = lines.stream()
            .map(line -> decimal(line.get("debit")))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal creditTotal = lines.stream()
            .map(line -> decimal(line.get("credit")))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Totals(scale(debitTotal), scale(creditTotal));
    }

    private BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (value instanceof BigDecimal bigDecimal) {
            return scale(bigDecimal);
        }
        return scale(new BigDecimal(String.valueOf(value)));
    }

    private BigDecimal scale(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String nextReferenceNumber(UUID tenantId, LocalDate entryDate) {
        LocalDate yearStart = LocalDate.of(entryDate.getYear(), 1, 1);
        LocalDate yearEnd = LocalDate.of(entryDate.getYear(), 12, 31);
        long count = journalEntryRepository.countByTenantIdAndEntryDateBetweenAndDeletedAtIsNull(tenantId, yearStart, yearEnd);
        return "JE-" + entryDate.getYear() + "-" + String.format("%04d", count + 1);
    }

    private void publishCreated(JournalEntry entry) {
        eventPublisher.publish("finance.events", "JOURNAL_ENTRY_CREATED", Map.of(
            "id", entry.getId(),
            "amount", entry.getAmount(),
            "currencyCode", entry.getCurrencyCode(),
            "status", entry.getStatus()
        ));
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JSON serialization failed", e);
        }
    }

    private record Totals(BigDecimal debitTotal, BigDecimal creditTotal) {
        boolean balanced() {
            return debitTotal.compareTo(creditTotal) == 0 && debitTotal.compareTo(BigDecimal.ZERO) > 0;
        }
    }
}
