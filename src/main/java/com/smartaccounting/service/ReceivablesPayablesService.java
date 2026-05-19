package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreateInvoiceRequest;
import com.smartaccounting.dto.NotificationEventRequest;
import com.smartaccounting.dto.CreateSupplierBillRequest;
import com.smartaccounting.dto.PatchFinanceCustomerRequest;
import com.smartaccounting.dto.PatchFinanceSupplierRequest;
import com.smartaccounting.dto.SupplierStatementReconciliationRequest;
import com.smartaccounting.entity.FinanceCustomer;
import com.smartaccounting.entity.FinanceSupplier;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.entity.PaymentApplication;
import com.smartaccounting.entity.ReconciliationMatchItem;
import com.smartaccounting.entity.SupplierBill;
import com.smartaccounting.repository.FinanceCustomerRepository;
import com.smartaccounting.repository.FinanceSupplierRepository;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.repository.PaymentApplicationRepository;
import com.smartaccounting.repository.ReconciliationMatchItemRepository;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Instant;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

@Service
public class ReceivablesPayablesService {
    private final InvoiceRepository invoiceRepository;
    private final FinanceCustomerRepository financeCustomerRepository;
    private final FinanceSupplierRepository financeSupplierRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final PaymentApplicationRepository paymentApplicationRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final FinanceService financeService;
    private final IdempotencyService idempotencyService;
    private final ReconciliationMatchItemRepository reconciliationMatchItemRepository;
    private final JdbcTemplate jdbcTemplate;

    public ReceivablesPayablesService(InvoiceRepository invoiceRepository,
                                      FinanceCustomerRepository financeCustomerRepository,
                                      FinanceSupplierRepository financeSupplierRepository,
                                      SupplierBillRepository supplierBillRepository,
                                      PaymentApplicationRepository paymentApplicationRepository,
                                      NotificationService notificationService,
                                      AuditService auditService,
                                      FinanceService financeService,
                                      IdempotencyService idempotencyService,
                                      ReconciliationMatchItemRepository reconciliationMatchItemRepository,
                                      JdbcTemplate jdbcTemplate) {
        this.invoiceRepository = invoiceRepository;
        this.financeCustomerRepository = financeCustomerRepository;
        this.financeSupplierRepository = financeSupplierRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.paymentApplicationRepository = paymentApplicationRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.financeService = financeService;
        this.idempotencyService = idempotencyService;
        this.reconciliationMatchItemRepository = reconciliationMatchItemRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public UUID createInvoice(CreateInvoiceRequest request) {
        UUID tenantId = requireTenant();
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setTenantId(tenantId);
        FinanceCustomer customer = resolveOrCreateCustomer(tenantId, request.customerName());
        invoice.setCustomerId(customer.getId());
        invoice.setCustomerName(customer.getCustomerName());
        invoice.setAmount(request.amount());
        invoice.setCurrencyCode(request.currencyCode());
        invoice.setDueDate(request.dueDate());
        invoice.setStatus("OPEN");
        invoice.setReminderCount(0);
        invoice.setLastReminderSentDate(null);
        invoice.setCreatedAt(Instant.now());
        invoiceRepository.save(invoice);
        auditService.logAction("INVOICE_CREATED", "INVOICE", "{}", "{\"id\":\"" + invoice.getId() + "\"}");
        return invoice.getId();
    }

    @Transactional
    public UUID createSupplierBill(CreateSupplierBillRequest request) {
        UUID tenantId = requireTenant();
        FinanceSupplier supplier = resolveOrCreateSupplier(tenantId, request.supplierName());
        SupplierBill bill = new SupplierBill();
        bill.setId(UUID.randomUUID());
        bill.setTenantId(tenantId);
        bill.setSupplierId(supplier.getId());
        bill.setSupplierName(supplier.getSupplierName());
        bill.setAmount(request.amount());
        bill.setCurrencyCode(request.currencyCode());
        bill.setDueDate(request.dueDate());
        bill.setStatus("OPEN");
        bill.setCreatedAt(Instant.now());
        supplierBillRepository.save(bill);

        BigDecimal outstanding = openApBalance(tenantId, supplier.getId());
        BigDecimal limit = normalizeLimit(supplier.getCreditLimit());
        if (outstanding.compareTo(limit) > 0) {
            String message = "Supplier " + supplier.getSupplierName()
                + " credit limit exceeded. Outstanding: " + outstanding.setScale(2, RoundingMode.HALF_UP).toPlainString()
                + ". Limit: " + limit.setScale(2, RoundingMode.HALF_UP).toPlainString() + ".";
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("supplierId", supplier.getId().toString());
            payload.put("supplierName", supplier.getSupplierName());
            payload.put("outstanding", outstanding.setScale(2, RoundingMode.HALF_UP).toPlainString());
            payload.put("limit", limit.setScale(2, RoundingMode.HALF_UP).toPlainString());
            payload.put("message", message);
            notificationService.emit(new NotificationEventRequest(
                "SUPPLIER_CREDIT_LIMIT_EXCEEDED",
                payload,
                List.of("sms", "in-app"),
                "cfo"
            ));
        }
        auditService.logAction("SUPPLIER_BILL_CREATED", "SUPPLIER_BILL", "{}", "{\"id\":\"" + bill.getId() + "\"}");
        return bill.getId();
    }

    @Transactional
    public UUID archiveInvoice(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByIdAndDeletedAtIsNull(invoiceId)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        invoice.setDeletedAt(Instant.now());
        invoiceRepository.save(invoice);
        auditService.logAction("INVOICE_ARCHIVED", "INVOICE", "{}", "{\"id\":\"" + invoiceId + "\"}");
        return invoice.getId();
    }

    @Transactional
    public UUID archiveSupplierBill(UUID billId) {
        SupplierBill bill = supplierBillRepository.findByIdAndDeletedAtIsNull(billId)
            .orElseThrow(() -> new IllegalArgumentException("Supplier bill not found"));
        bill.setDeletedAt(Instant.now());
        supplierBillRepository.save(bill);
        auditService.logAction("SUPPLIER_BILL_ARCHIVED", "SUPPLIER_BILL", "{}", "{\"id\":\"" + billId + "\"}");
        return bill.getId();
    }

    @Transactional
    public Map<String, Object> reconcileSupplierStatement(UUID supplierId, SupplierStatementReconciliationRequest request) {
        UUID tenantId = requireTenant();
        FinanceSupplier supplier = financeSupplierRepository.findByIdAndTenantId(supplierId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Supplier not found"));

        List<SupplierBill> systemBills = supplierBillRepository
            .findByTenantIdAndSupplierIdAndDeletedAtIsNullOrderByCreatedAtAsc(tenantId, supplierId);
        List<StatementLine> statementLines = request.invoices().stream()
            .map(row -> new StatementLine(row.reference().trim(), row.amount()))
            .toList();
        boolean[] statementMatched = new boolean[statementLines.size()];
        boolean[] systemMatched = new boolean[systemBills.size()];

        List<Map<String, Object>> matched = new java.util.ArrayList<>();
        for (int i = 0; i < systemBills.size(); i++) {
            SupplierBill bill = systemBills.get(i);
            String billReference = bill.getId().toString();
            for (int j = 0; j < statementLines.size(); j++) {
                if (statementMatched[j]) {
                    continue;
                }
                StatementLine line = statementLines.get(j);
                if (billReference.equalsIgnoreCase(line.reference()) && bill.getAmount().compareTo(line.amount()) == 0) {
                    systemMatched[i] = true;
                    statementMatched[j] = true;
                    matched.add(Map.of(
                        "reference", line.reference(),
                        "amount", line.amount(),
                        "supplierBillId", bill.getId()
                    ));
                    break;
                }
            }
        }

        List<Map<String, Object>> systemOnly = new java.util.ArrayList<>();
        for (int i = 0; i < systemBills.size(); i++) {
            if (systemMatched[i]) {
                continue;
            }
            SupplierBill bill = systemBills.get(i);
            systemOnly.add(Map.of(
                "reference", bill.getId().toString(),
                "amount", bill.getAmount(),
                "supplierBillId", bill.getId()
            ));
            registerUnmatchedIfMissing(tenantId, "SUPPLIER_BILL", bill.getId(), bill.getAmount());
        }

        List<Map<String, Object>> statementOnly = new java.util.ArrayList<>();
        for (int i = 0; i < statementLines.size(); i++) {
            if (statementMatched[i]) {
                continue;
            }
            StatementLine line = statementLines.get(i);
            statementOnly.add(Map.of(
                "reference", line.reference(),
                "amount", line.amount()
            ));
            UUID statementItemId = UUID.nameUUIDFromBytes(
                ("supplier-statement-only:" + supplierId + ":" + line.reference() + ":" + line.amount().toPlainString())
                    .getBytes(StandardCharsets.UTF_8)
            );
            registerUnmatchedIfMissing(tenantId, "SUPPLIER_STATEMENT", statementItemId, line.amount());
        }

        BigDecimal systemTotal = systemBills.stream()
            .map(SupplierBill::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal statementTotal = statementLines.stream()
            .map(StatementLine::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal balanceDifference = systemTotal.subtract(statementTotal).setScale(2, RoundingMode.HALF_UP);

        auditService.logAction("SUPPLIER_STATEMENT_RECONCILED", "SUPPLIER_BILL", "{}",
            "{\"supplierId\":\"" + supplier.getId() + "\",\"matched\":" + matched.size() + "}");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("matched", matched);
        out.put("systemOnly", systemOnly);
        out.put("statementOnly", statementOnly);
        out.put("balanceDifference", balanceDifference);
        return out;
    }

    @Transactional
    public Map<String, Object> writeOffInvoiceBadDebt(UUID invoiceId) {
        UUID tenantId = requireTenant();
        String routeKey = "finance.invoice.bad-debt";
        String idempotencyKey = "invoice-bad-debt:" + invoiceId;
        Map<String, Object> requestPayload = Map.of("invoiceId", invoiceId.toString());
        java.util.Optional<Map<String, Object>> replay = idempotencyService.begin(tenantId, routeKey, idempotencyKey, requestPayload);
        if (replay.isPresent()) {
            return replay.get();
        }

        Invoice invoice = invoiceRepository.findByIdAndDeletedAtIsNull(invoiceId)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        if (!tenantId.equals(invoice.getTenantId())) {
            throw new IllegalArgumentException("Invoice not found");
        }

        BigDecimal appliedAmount = paymentApplicationRepository
            .findByTenantIdAndTargetTypeAndTargetId(tenantId, "INVOICE", invoice.getId()).stream()
            .map(PaymentApplication::getAppliedAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal outstandingAmount = invoice.getAmount().subtract(appliedAmount).max(BigDecimal.ZERO);
        if (outstandingAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Invoice has no outstanding balance to write off");
        }

        UUID journalEntryId = financeService.createJournalEntry(new com.smartaccounting.dto.CreateJournalEntryRequest(
            LocalDate.now(),
            "Bad debt write-off for invoice " + invoice.getId(),
            "BAD_DEBT_EXPENSE",
            "ACCOUNTS_RECEIVABLE",
            outstandingAmount,
            invoice.getCurrencyCode()
        ));
        invoice.setStatus("BAD_DEBT");
        invoice.setDeletedAt(Instant.now());
        invoiceRepository.save(invoice);
        auditService.logAction("INVOICE_BAD_DEBT_WRITTEN_OFF", "INVOICE", "{}",
            "{\"id\":\"" + invoice.getId() + "\",\"journalEntryId\":\"" + journalEntryId + "\"}");

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("invoiceId", invoice.getId());
        response.put("journalEntryId", journalEntryId);
        response.put("status", invoice.getStatus());
        response.put("archived", true);
        response.put("outstandingAmountWrittenOff", outstandingAmount);
        idempotencyService.complete(tenantId, routeKey, idempotencyKey, response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listSupplierBills(String status, String supplierName) {
        UUID tenantId = requireTenant();
        String statusFilter = status != null ? status.trim().toUpperCase(Locale.ROOT) : "";
        String supplierFilter = supplierName != null ? supplierName.trim().toLowerCase(Locale.ROOT) : "";
        LocalDate today = LocalDate.now();

        List<SupplierBill> bills = supplierBillRepository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId);

        return bills.stream()
            .filter(b -> supplierFilter.isEmpty()
                || (b.getSupplierName() != null
                    && b.getSupplierName().toLowerCase(Locale.ROOT).contains(supplierFilter)))
            .map(bill -> {
                List<PaymentApplication> appliedRows = paymentApplicationRepository
                    .findByTenantIdAndTargetTypeAndTargetId(tenantId, "SUPPLIER_BILL", bill.getId());
                BigDecimal appliedAmount = appliedRows.stream()
                    .map(PaymentApplication::getAppliedAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal outstandingAmount = bill.getAmount().subtract(appliedAmount).max(BigDecimal.ZERO);

                Map<String, Object> m = new LinkedHashMap<>();
                m.put("supplierBillId", bill.getId());
                m.put("supplierId", bill.getSupplierId());
                m.put("supplierName", bill.getSupplierName());
                m.put("reference", bill.getId().toString());
                m.put("amount", bill.getAmount());
                m.put("appliedAmount", appliedAmount);
                m.put("outstandingAmount", outstandingAmount);
                m.put("currencyCode", bill.getCurrencyCode());
                m.put("dueDate", bill.getDueDate());
                m.put("status", bill.getStatus());
                m.put("createdAt", bill.getCreatedAt());
                boolean overdue = !"PAID".equalsIgnoreCase(bill.getStatus())
                    && bill.getDueDate() != null
                    && bill.getDueDate().isBefore(today)
                    && outstandingAmount.compareTo(BigDecimal.ZERO) > 0;
                m.put("overdue", overdue);
                return m;
            })
            .filter(m -> {
                if (statusFilter.isEmpty()) {
                    return true;
                }
                if ("OVERDUE".equals(statusFilter)) {
                    return Boolean.TRUE.equals(m.get("overdue"));
                }
                Object st = m.get("status");
                return st != null && statusFilter.equals(st.toString().toUpperCase(Locale.ROOT));
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listInvoices(String status, String customerName) {
        UUID tenantId = requireTenant();
        String statusFilter = status != null ? status.trim().toUpperCase(Locale.ROOT) : "";
        String customerFilter = customerName != null ? customerName.trim().toLowerCase(Locale.ROOT) : "";
        LocalDate today = LocalDate.now();

        List<Invoice> invoices;
        if ("BAD_DEBT".equals(statusFilter)) {
            invoices = invoiceRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        } else {
            invoices = invoiceRepository.findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId);
        }

        return invoices.stream()
            .filter(inv -> customerFilter.isEmpty()
                || (inv.getCustomerName() != null
                    && inv.getCustomerName().toLowerCase(Locale.ROOT).contains(customerFilter)))
            .map(inv -> {
                List<PaymentApplication> appliedRows = paymentApplicationRepository
                    .findByTenantIdAndTargetTypeAndTargetId(tenantId, "INVOICE", inv.getId());
                java.math.BigDecimal appliedAmount = appliedRows.stream()
                    .map(PaymentApplication::getAppliedAmount)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                java.math.BigDecimal outstandingAmount = inv.getAmount().subtract(appliedAmount).max(java.math.BigDecimal.ZERO);

                Map<String, Object> m = new LinkedHashMap<>();
                m.put("invoiceId", inv.getId());
                m.put("customerId", inv.getCustomerId());
                m.put("customerName", inv.getCustomerName());
                m.put("amount", inv.getAmount());
                m.put("appliedAmount", appliedAmount);
                m.put("outstandingAmount", outstandingAmount);
                m.put("currencyCode", inv.getCurrencyCode());
                m.put("dueDate", inv.getDueDate());
                m.put("status", inv.getStatus());
                m.put("createdAt", inv.getCreatedAt());
                m.put("overdue", "OPEN".equalsIgnoreCase(inv.getStatus()) && inv.getDueDate() != null && inv.getDueDate().isBefore(today));
                return m;
            })
            .filter(m -> {
                if (statusFilter.isEmpty()) {
                    return true;
                }
                if ("OVERDUE".equals(statusFilter)) {
                    return Boolean.TRUE.equals(m.get("overdue"));
                }
                Object st = m.get("status");
                return st != null && statusFilter.equals(st.toString().toUpperCase(Locale.ROOT));
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> customerCreditStatus(UUID customerId) {
        UUID tenantId = requireTenant();
        FinanceCustomer customer = financeCustomerRepository.findByIdAndTenantId(customerId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        BigDecimal balance = openArBalance(tenantId, customerId);
        BigDecimal limit = normalizeLimit(customer.getCreditLimit());
        BigDecimal available = limit.subtract(balance).setScale(2, RoundingMode.HALF_UP);
        if (available.signum() < 0) {
            available = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        Invoice oldestOverdue = oldestOverdueInvoice(tenantId, customerId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("customerId", customer.getId());
        out.put("customerName", customer.getCustomerName());
        out.put("currentBalance", balance);
        out.put("creditLimit", limit);
        out.put("availableCredit", available);
        out.put("oldestOverdueInvoiceId", oldestOverdue != null ? oldestOverdue.getId() : null);
        out.put("oldestOverdueInvoiceDueDate", oldestOverdue != null ? oldestOverdue.getDueDate() : null);
        out.put("badDebtRiskScore", normalizeRiskScore(customer.getBadDebtRiskScore()));
        return out;
    }

    @Transactional
    public Map<String, Object> patchCustomer(UUID customerId, PatchFinanceCustomerRequest request) {
        UUID tenantId = requireTenant();
        if (request.creditLimit() == null) {
            throw new IllegalArgumentException("creditLimit is required");
        }
        FinanceCustomer customer = financeCustomerRepository.findByIdAndTenantId(customerId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        customer.setCreditLimit(normalizeLimit(request.creditLimit()));
        customer.setUpdatedAt(Instant.now());
        financeCustomerRepository.save(customer);
        auditService.logAction("FINANCE_CUSTOMER_UPDATED", "FINANCE_CUSTOMER", "{}",
            "{\"id\":\"" + customerId + "\",\"field\":\"creditLimit\"}");
        return customerCreditStatus(customerId);
    }

    @Transactional
    public Map<String, Object> patchSupplier(UUID supplierId, PatchFinanceSupplierRequest request) {
        UUID tenantId = requireTenant();
        if (request.creditLimit() == null && request.paymentTermsDays() == null) {
            throw new IllegalArgumentException("Provide creditLimit and/or paymentTermsDays");
        }
        FinanceSupplier supplier = financeSupplierRepository.findByIdAndTenantId(supplierId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Supplier not found"));
        if (request.creditLimit() != null) {
            supplier.setCreditLimit(normalizeLimit(request.creditLimit()));
        }
        if (request.paymentTermsDays() != null) {
            supplier.setPaymentTermsDays(request.paymentTermsDays());
        }
        supplier.setUpdatedAt(Instant.now());
        financeSupplierRepository.save(supplier);
        auditService.logAction("FINANCE_SUPPLIER_UPDATED", "FINANCE_SUPPLIER", "{}",
            "{\"id\":\"" + supplierId + "\"}");
        return supplierCreditStatus(supplierId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> supplierCreditStatus(UUID supplierId) {
        UUID tenantId = requireTenant();
        FinanceSupplier supplier = financeSupplierRepository.findByIdAndTenantId(supplierId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Supplier not found"));
        BigDecimal totalOutstanding = openApBalance(tenantId, supplierId);
        BigDecimal limit = normalizeLimit(supplier.getCreditLimit());
        BigDecimal available = limit.subtract(totalOutstanding).setScale(2, RoundingMode.HALF_UP);
        if (available.signum() < 0) {
            available = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        LocalDate nextDueDate = nextDueDate(tenantId, supplierId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("supplierId", supplier.getId());
        out.put("supplierName", supplier.getSupplierName());
        out.put("totalOutstanding", totalOutstanding);
        out.put("creditLimit", limit);
        out.put("availableCredit", available);
        out.put("nextDueDate", nextDueDate);
        out.put("paymentTermsDays", supplier.getPaymentTermsDays());
        return out;
    }

    @Transactional(readOnly = true)
    public FinanceCustomer resolveOrCreateCustomerForOnAccount(String customerName) {
        UUID tenantId = requireTenant();
        return resolveOrCreateCustomer(tenantId, customerName);
    }

    @Transactional(readOnly = true)
    public BigDecimal openArBalance(UUID customerId) {
        UUID tenantId = requireTenant();
        return openArBalance(tenantId, customerId);
    }

    private FinanceCustomer resolveOrCreateCustomer(UUID tenantId, String customerName) {
        String normalizedName = customerName == null ? "" : customerName.trim();
        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("customerName is required");
        }
        return financeCustomerRepository.findFirstByTenantIdAndCustomerNameIgnoreCaseAndDeletedAtIsNull(tenantId, normalizedName)
            .orElseGet(() -> {
                FinanceCustomer c = new FinanceCustomer();
                c.setId(UUID.randomUUID());
                c.setTenantId(tenantId);
                c.setCustomerName(normalizedName);
                c.setCreditLimit(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                c.setBadDebtRiskScore(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP));
                c.setCreatedAt(Instant.now());
                c.setUpdatedAt(Instant.now());
                return financeCustomerRepository.save(c);
            });
    }

    private FinanceSupplier resolveOrCreateSupplier(UUID tenantId, String supplierName) {
        String normalizedName = supplierName == null ? "" : supplierName.trim();
        if (normalizedName.isBlank()) {
            throw new IllegalArgumentException("supplierName is required");
        }
        return financeSupplierRepository.findFirstByTenantIdAndSupplierNameIgnoreCase(tenantId, normalizedName)
            .orElseGet(() -> {
                FinanceSupplier s = new FinanceSupplier();
                s.setId(UUID.randomUUID());
                s.setTenantId(tenantId);
                s.setSupplierName(normalizedName);
                s.setCreditLimit(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
                s.setPaymentTermsDays(30);
                s.setCreatedAt(Instant.now());
                s.setUpdatedAt(Instant.now());
                return financeSupplierRepository.save(s);
            });
    }

    private BigDecimal openArBalance(UUID tenantId, UUID customerId) {
        BigDecimal total = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        for (Invoice inv : invoiceRepository.findByTenantIdAndCustomerIdAndDeletedAtIsNullOrderByCreatedAtAsc(tenantId, customerId)) {
            if ("PAID".equalsIgnoreCase(inv.getStatus())) {
                continue;
            }
            BigDecimal applied = paymentApplicationRepository.findByTenantIdAndTargetTypeAndTargetId(tenantId, "INVOICE", inv.getId()).stream()
                .map(PaymentApplication::getAppliedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal outstanding = inv.getAmount().subtract(applied).max(BigDecimal.ZERO);
            total = total.add(outstanding).setScale(2, RoundingMode.HALF_UP);
        }
        return total;
    }

    private Invoice oldestOverdueInvoice(UUID tenantId, UUID customerId) {
        LocalDate today = LocalDate.now();
        for (Invoice inv : invoiceRepository.findByTenantIdAndCustomerIdAndDeletedAtIsNullOrderByCreatedAtAsc(tenantId, customerId)) {
            if (inv.getDueDate() != null && inv.getDueDate().isBefore(today) && !"PAID".equalsIgnoreCase(inv.getStatus())) {
                BigDecimal applied = paymentApplicationRepository.findByTenantIdAndTargetTypeAndTargetId(tenantId, "INVOICE", inv.getId()).stream()
                    .map(PaymentApplication::getAppliedAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal outstanding = inv.getAmount().subtract(applied).max(BigDecimal.ZERO);
                if (outstanding.compareTo(BigDecimal.ZERO) > 0) {
                    return inv;
                }
            }
        }
        return null;
    }

    private static BigDecimal normalizeLimit(BigDecimal raw) {
        if (raw == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return raw.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal normalizeRiskScore(BigDecimal raw) {
        if (raw == null) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        return raw.max(BigDecimal.ZERO).min(BigDecimal.ONE).setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal openApBalance(UUID tenantId, UUID supplierId) {
        BigDecimal total = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        for (SupplierBill bill : supplierBillRepository.findByTenantIdAndSupplierIdAndDeletedAtIsNullOrderByCreatedAtAsc(tenantId, supplierId)) {
            if ("PAID".equalsIgnoreCase(bill.getStatus())) {
                continue;
            }
            BigDecimal applied = paymentApplicationRepository.findByTenantIdAndTargetTypeAndTargetId(tenantId, "SUPPLIER_BILL", bill.getId()).stream()
                .map(PaymentApplication::getAppliedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal outstanding = bill.getAmount().subtract(applied).max(BigDecimal.ZERO);
            total = total.add(outstanding).setScale(2, RoundingMode.HALF_UP);
        }
        return total;
    }

    private LocalDate nextDueDate(UUID tenantId, UUID supplierId) {
        LocalDate next = null;
        for (SupplierBill bill : supplierBillRepository.findByTenantIdAndSupplierIdAndDeletedAtIsNullOrderByCreatedAtAsc(tenantId, supplierId)) {
            if ("PAID".equalsIgnoreCase(bill.getStatus())) {
                continue;
            }
            BigDecimal applied = paymentApplicationRepository.findByTenantIdAndTargetTypeAndTargetId(tenantId, "SUPPLIER_BILL", bill.getId()).stream()
                .map(PaymentApplication::getAppliedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal outstanding = bill.getAmount().subtract(applied).max(BigDecimal.ZERO);
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0 || bill.getDueDate() == null) {
                continue;
            }
            if (next == null || bill.getDueDate().isBefore(next)) {
                next = bill.getDueDate();
            }
        }
        return next;
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalOverdueAr(UUID tenantId) {
        if (tenantId == null) {
            return BigDecimal.ZERO;
        }
        return queryMoney(
            """
            select coalesce(sum(amount),0) from invoices
            where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date
            """,
            tenantId
        );
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalOverdueAp(UUID tenantId) {
        if (tenantId == null) {
            return BigDecimal.ZERO;
        }
        return queryMoney(
            """
            select coalesce(sum(amount),0) from supplier_bills
            where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date
            """,
            tenantId
        );
    }

    @Transactional(readOnly = true)
    public long getOverdueCustomerCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        return queryLong(
            """
            select count(distinct customer_name) from invoices
            where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date
            """,
            tenantId
        );
    }

    @Transactional(readOnly = true)
    public long getOverdueInvoiceCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        return queryLong(
            """
            select count(*) from invoices
            where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date
            """,
            tenantId
        );
    }

    @Transactional(readOnly = true)
    public long getOverdueSupplierCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        return queryLong(
            """
            select count(*) from supplier_bills
            where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date
            """,
            tenantId
        );
    }

    @Transactional(readOnly = true)
    public long getSupplierPaymentsDueCount(UUID tenantId, int daysWithin) {
        if (tenantId == null || daysWithin <= 0) {
            return 0L;
        }
        LocalDate end = LocalDate.now().plusDays(daysWithin);
        try {
            Long n = jdbcTemplate.queryForObject(
                """
                select count(*) from supplier_bills
                where tenant_id = ? and status = 'OPEN' and deleted_at is null
                and due_date >= ? and due_date <= ?
                """,
                Long.class,
                tenantId,
                LocalDate.now(),
                end
            );
            return n == null ? 0L : n;
        } catch (Exception ex) {
            return 0L;
        }
    }

    private BigDecimal queryMoney(String sql, UUID tenantId) {
        try {
            Number n = jdbcTemplate.queryForObject(sql, Number.class, tenantId);
            if (n == null) {
                return BigDecimal.ZERO;
            }
            if (n instanceof BigDecimal bd) {
                return bd;
            }
            return BigDecimal.valueOf(n.doubleValue());
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    private long queryLong(String sql, UUID tenantId) {
        try {
            Long n = jdbcTemplate.queryForObject(sql, Long.class, tenantId);
            return n == null ? 0L : n;
        } catch (Exception ex) {
            return 0L;
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }

    private void registerUnmatchedIfMissing(UUID tenantId, String itemType, UUID itemId, BigDecimal amount) {
        if (reconciliationMatchItemRepository.existsByTenantIdAndItemTypeAndItemIdAndMatchedFalse(tenantId, itemType, itemId)) {
            return;
        }
        ReconciliationMatchItem item = new ReconciliationMatchItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(tenantId);
        item.setItemType(itemType);
        item.setItemId(itemId);
        item.setAmount(amount);
        item.setMatched(false);
        item.setCreatedAt(Instant.now());
        reconciliationMatchItemRepository.save(item);
    }

    private record StatementLine(String reference, BigDecimal amount) {
    }
}
