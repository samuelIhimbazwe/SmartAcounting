package com.smartaccounting.service;

import com.smartaccounting.dto.BankAccountRequest;
import com.smartaccounting.dto.BankReconciliationSummary;
import com.smartaccounting.dto.CreateJournalEntryRequest;
import com.smartaccounting.entity.BankAccount;
import com.smartaccounting.entity.BankStatementImport;
import com.smartaccounting.entity.BankStatementLine;
import com.smartaccounting.entity.JournalEntry;
import com.smartaccounting.repository.BankAccountRepository;
import com.smartaccounting.repository.BankStatementImportRepository;
import com.smartaccounting.repository.BankStatementLineRepository;
import com.smartaccounting.repository.JournalEntryRepository;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BankReconciliationService {
    private static final Logger log = LoggerFactory.getLogger(BankReconciliationService.class);
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
        DateTimeFormatter.ISO_LOCAL_DATE,
        DateTimeFormatter.ofPattern("dd/MM/yyyy"),
        DateTimeFormatter.ofPattern("dd-MM-yyyy"),
        DateTimeFormatter.ofPattern("yyyy/MM/dd")
    );

    private final BankAccountRepository bankAccountRepository;
    private final BankStatementLineRepository bankStatementLineRepository;
    private final BankStatementImportRepository bankStatementImportRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final FinanceService financeService;

    public BankReconciliationService(BankAccountRepository bankAccountRepository,
                                     BankStatementLineRepository bankStatementLineRepository,
                                     BankStatementImportRepository bankStatementImportRepository,
                                     JournalEntryRepository journalEntryRepository,
                                     FinanceService financeService) {
        this.bankAccountRepository = bankAccountRepository;
        this.bankStatementLineRepository = bankStatementLineRepository;
        this.bankStatementImportRepository = bankStatementImportRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.financeService = financeService;
    }

    public BankAccount createBankAccount(BankAccountRequest request) {
        UUID tenantId = requireTenant();
        BankAccount account = new BankAccount();
        account.setId(UUID.randomUUID());
        account.setTenantId(tenantId);
        account.setAccountName(request.accountName());
        account.setAccountNumber(request.accountNumber());
        account.setBankName(request.bankName());
        account.setCurrencyCode(request.currencyCode() != null ? request.currencyCode() : "RWF");
        account.setCurrentBalance(BigDecimal.ZERO);
        account.setCreatedAt(Instant.now());
        return bankAccountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public List<BankAccount> listBankAccounts() {
        return bankAccountRepository.findByTenantIdAndDeletedAtIsNullOrderByAccountNameAsc(requireTenant());
    }

    public BankStatementImport importStatement(UUID bankAccountId, MultipartFile file, UUID importedBy) throws IOException {
        UUID tenantId = requireTenant();
        bankAccountRepository.findByIdAndTenantIdAndDeletedAtIsNull(bankAccountId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Bank account not found"));

        UUID batchId = UUID.randomUUID();
        List<String[]> rows = parseCsv(file);
        List<BankStatementLine> lines = new ArrayList<>();

        for (String[] row : rows) {
            try {
                LocalDate txDate = parseDate(row);
                if (txDate == null) {
                    continue;
                }
                BankStatementLine line = new BankStatementLine();
                line.setId(UUID.randomUUID());
                line.setTenantId(tenantId);
                line.setBankAccountId(bankAccountId);
                line.setTransactionDate(txDate);
                line.setDescription(extractDescription(row));
                line.setReference(extractReference(row));
                line.setDebitAmount(extractDebit(row));
                line.setCreditAmount(extractCredit(row));
                line.setBalance(extractBalance(row));
                line.setCurrencyCode("RWF");
                line.setStatus("UNMATCHED");
                line.setImportBatchId(batchId);
                line.setCreatedAt(Instant.now());
                lines.add(line);
            } catch (Exception e) {
                log.warn("Skipping unparseable row: {}", Arrays.toString(row));
            }
        }

        bankStatementLineRepository.saveAll(lines);
        int matched = autoMatch(tenantId, bankAccountId, lines);

        BankStatementImport importRecord = new BankStatementImport();
        importRecord.setId(batchId);
        importRecord.setTenantId(tenantId);
        importRecord.setBankAccountId(bankAccountId);
        importRecord.setFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "statement.csv");
        importRecord.setImportedBy(importedBy);
        importRecord.setLineCount(lines.size());
        importRecord.setMatchedCount(matched);
        importRecord.setUnmatchedCount(lines.size() - matched);
        importRecord.setStatus("COMPLETE");
        importRecord.setImportedAt(Instant.now());
        return bankStatementImportRepository.save(importRecord);
    }

    public int autoMatch(UUID tenantId, UUID bankAccountId, List<BankStatementLine> lines) {
        int matched = 0;
        for (BankStatementLine line : lines) {
            if ("MATCHED".equals(line.getStatus())) {
                continue;
            }
            BigDecimal amount = lineAmount(line);
            if (amount == null) {
                continue;
            }
            LocalDate from = line.getTransactionDate().minusDays(2);
            LocalDate to = line.getTransactionDate().plusDays(2);

            List<JournalEntry> byRef = journalEntryRepository.findCandidatesForBankMatch(
                tenantId, line.getReference(), amount, from, to);
            if (!byRef.isEmpty()) {
                JournalEntry entry = byRef.get(0);
                line.setStatus("MATCHED");
                line.setMatchedJournalId(entry.getId());
                line.setMatchedAt(Instant.now());
                bankStatementLineRepository.save(line);
                matched++;
                continue;
            }

            List<JournalEntry> byAmount = journalEntryRepository.findByTenantIdAndAmountAndEntryDateBetween(
                tenantId, amount, from, to);
            Optional<JournalEntry> suggested = byAmount.stream()
                .filter(j -> !isJournalAlreadyMatched(tenantId, j.getId()))
                .findFirst();
            if (suggested.isPresent()) {
                line.setStatus("SUGGESTED");
                line.setMatchedJournalId(suggested.get().getId());
                bankStatementLineRepository.save(line);
                matched++;
            }
        }
        return matched;
    }

    public void confirmMatch(UUID statementLineId, UUID journalEntryId) {
        UUID tenantId = requireTenant();
        BankStatementLine line = bankStatementLineRepository.findByIdAndTenantId(statementLineId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Statement line not found"));
        line.setStatus("MATCHED");
        line.setMatchedJournalId(journalEntryId);
        line.setMatchedAt(Instant.now());
        bankStatementLineRepository.save(line);
    }

    public void postBankCharge(UUID statementLineId, String description) {
        UUID tenantId = requireTenant();
        BankStatementLine line = bankStatementLineRepository.findByIdAndTenantId(statementLineId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Statement line not found"));
        BigDecimal amount = line.getDebitAmount() != null ? line.getDebitAmount() : lineAmount(line);
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Bank charge amount is required");
        }
        String desc = description != null && !description.isBlank() ? description : line.getDescription();
        UUID journalId = financeService.createJournalEntry(new CreateJournalEntryRequest(
            line.getTransactionDate(),
            desc != null ? desc : "Bank charge",
            "BANK_CHARGES",
            "BANK_ACCOUNT",
            amount,
            line.getCurrencyCode() != null ? line.getCurrencyCode() : "RWF"
        ));
        line.setStatus("MATCHED");
        line.setMatchedJournalId(journalId);
        line.setMatchedAt(Instant.now());
        bankStatementLineRepository.save(line);
    }

    public int runAutoMatchForAccount(UUID bankAccountId) {
        UUID tenantId = requireTenant();
        bankAccountRepository.findByIdAndTenantIdAndDeletedAtIsNull(bankAccountId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Bank account not found"));
        List<BankStatementLine> lines = bankStatementLineRepository.findByTenantIdAndBankAccountIdAndStatusIn(
            tenantId, bankAccountId, List.of("UNMATCHED", "SUGGESTED"));
        return autoMatch(tenantId, bankAccountId, lines);
    }

    @Transactional(readOnly = true)
    public Page<BankStatementLine> getUnmatched(UUID bankAccountId, Pageable pageable) {
        UUID tenantId = requireTenant();
        return bankStatementLineRepository.findByTenantIdAndBankAccountIdAndStatusIn(
            tenantId, bankAccountId, List.of("UNMATCHED", "SUGGESTED"), pageable);
    }

    @Transactional(readOnly = true)
    public BankReconciliationSummary getSummary(UUID bankAccountId) {
        UUID tenantId = requireTenant();
        long totalLines = bankStatementLineRepository.countByTenantIdAndBankAccountId(tenantId, bankAccountId);
        long matched = bankStatementLineRepository.countByTenantIdAndBankAccountIdAndStatus(tenantId, bankAccountId, "MATCHED");
        long unmatched = bankStatementLineRepository.countByTenantIdAndBankAccountIdAndStatus(tenantId, bankAccountId, "UNMATCHED");
        long suggested = bankStatementLineRepository.countByTenantIdAndBankAccountIdAndStatus(tenantId, bankAccountId, "SUGGESTED");
        double matchRate = totalLines > 0 ? (double) matched / totalLines * 100.0 : 0.0;
        return new BankReconciliationSummary(totalLines, matched, unmatched, suggested, matchRate);
    }

    @Transactional(readOnly = true)
    public List<BankStatementImport> getImportHistory(UUID bankAccountId) {
        return bankStatementImportRepository.findByTenantIdAndBankAccountIdOrderByImportedAtDesc(requireTenant(), bankAccountId);
    }

    private static BigDecimal lineAmount(BankStatementLine line) {
        if (line.getCreditAmount() != null && line.getCreditAmount().signum() > 0) {
            return line.getCreditAmount();
        }
        if (line.getDebitAmount() != null && line.getDebitAmount().signum() > 0) {
            return line.getDebitAmount();
        }
        return null;
    }

    private List<String[]> parseCsv(MultipartFile file) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean headerSkipped = false;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                String[] cols = splitCsvLine(line);
                if (!headerSkipped && looksLikeHeader(cols)) {
                    headerSkipped = true;
                    continue;
                }
                headerSkipped = true;
                rows.add(cols);
            }
        }
        return rows;
    }

    private static String[] splitCsvLine(String line) {
        return Arrays.stream(line.split(",", -1))
            .map(s -> s.trim().replaceAll("^\"|\"$", ""))
            .toArray(String[]::new);
    }

    private static boolean looksLikeHeader(String[] cols) {
        if (cols.length == 0) {
            return false;
        }
        String first = cols[0].toLowerCase(Locale.ROOT);
        return first.contains("date") || first.contains("transaction");
    }

    private static LocalDate parseDate(String[] row) {
        for (int i = 0; i < Math.min(3, row.length); i++) {
            String raw = row[i];
            if (raw == null || raw.isBlank()) {
                continue;
            }
            for (DateTimeFormatter fmt : DATE_FORMATS) {
                try {
                    return LocalDate.parse(raw.trim(), fmt);
                } catch (DateTimeParseException ignored) {
                }
            }
        }
        return null;
    }

    private static String extractDescription(String[] row) {
        if (row.length > 2) {
            return row[1];
        }
        return row.length > 1 ? row[1] : null;
    }

    private static String extractReference(String[] row) {
        if (row.length > 3) {
            return row[2];
        }
        return null;
    }

    private static BigDecimal extractDebit(String[] row) {
        return parseMoney(findColumn(row, "debit", 3));
    }

    private static BigDecimal extractCredit(String[] row) {
        return parseMoney(findColumn(row, "credit", 4));
    }

    private static BigDecimal extractBalance(String[] row) {
        return parseMoney(row.length > 5 ? row[5] : null);
    }

    private static String findColumn(String[] row, String keyword, int fallbackIndex) {
        if (row.length > fallbackIndex) {
            return row[fallbackIndex];
        }
        return null;
    }

    private static BigDecimal parseMoney(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = raw.replace(",", "").replaceAll("[^0-9.\\-]", "");
        if (cleaned.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(cleaned);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean isJournalAlreadyMatched(UUID tenantId, UUID journalId) {
        return bankStatementLineRepository.existsByTenantIdAndMatchedJournalIdAndStatus(
            tenantId, journalId, "MATCHED");
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
