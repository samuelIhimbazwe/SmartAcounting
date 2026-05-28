package com.smartaccounting.service;

import com.smartaccounting.dto.CreateLayawayRequest;
import com.smartaccounting.dto.CustomerPaymentRequest;
import com.smartaccounting.dto.LayawayPaymentRequest;
import com.smartaccounting.dto.LoyaltyTransactionRequest;
import com.smartaccounting.dto.UpsertCustomerRequest;
import com.smartaccounting.entity.CustomerCreditLedger;
import com.smartaccounting.entity.CustomerLoyaltyTransaction;
import com.smartaccounting.entity.FinanceCustomer;
import com.smartaccounting.entity.LayawayOrder;
import com.smartaccounting.entity.PosPaymentTender;
import com.smartaccounting.entity.PosSaleLine;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.repository.CustomerCreditLedgerRepository;
import com.smartaccounting.repository.CustomerLoyaltyTransactionRepository;
import com.smartaccounting.repository.FinanceCustomerRepository;
import com.smartaccounting.repository.LayawayOrderRepository;
import com.smartaccounting.repository.PosPaymentTenderRepository;
import com.smartaccounting.repository.PosSaleLineRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import com.smartaccounting.tenant.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class CustomerRetailService {
    public static final int POINTS_PER_100_FRW = 1;
    public static final int REDEEM_POINTS_BLOCK = 100;
    public static final BigDecimal REDEEM_VALUE_FRW = new BigDecimal("500");

    private final FinanceCustomerRepository customerRepository;
    private final CustomerLoyaltyTransactionRepository loyaltyRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final LayawayOrderRepository layawayRepository;
    private final CustomerCreditLedgerRepository creditLedgerRepository;
    private final PosSaleLineRepository saleLineRepository;
    private final PosPaymentTenderRepository tenderRepository;
    private final PriceListService priceListService;
    private final ObjectMapper objectMapper;

    @Value("${retail.credit-alert-threshold-pct:80}")
    private int creditAlertThresholdPct;

    public CustomerRetailService(FinanceCustomerRepository customerRepository,
                                 CustomerLoyaltyTransactionRepository loyaltyRepository,
                                 SalesOrderRepository salesOrderRepository,
                                 LayawayOrderRepository layawayRepository,
                                 CustomerCreditLedgerRepository creditLedgerRepository,
                                 PosSaleLineRepository saleLineRepository,
                                 PosPaymentTenderRepository tenderRepository,
                                 PriceListService priceListService,
                                 ObjectMapper objectMapper) {
        this.customerRepository = customerRepository;
        this.loyaltyRepository = loyaltyRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.layawayRepository = layawayRepository;
        this.creditLedgerRepository = creditLedgerRepository;
        this.saleLineRepository = saleLineRepository;
        this.tenderRepository = tenderRepository;
        this.priceListService = priceListService;
        this.objectMapper = objectMapper;
    }

    public List<Map<String, Object>> search(String q) {
        UUID tenant = requireTenant();
        String term = q == null ? "" : q.trim();
        List<FinanceCustomer> rows = term.isEmpty()
            ? customerRepository.findByTenantIdAndDeletedAtIsNullOrderByCustomerNameAsc(tenant)
            : customerRepository.search(tenant, term);
        Map<String, Instant> lastPurchaseByName = buildLastPurchaseMap(tenant);
        return rows.stream()
            .map(c -> toCustomerMap(c, lastPurchaseByName.get(normalizeNameKey(c.getCustomerName()))))
            .toList();
    }

    public Map<String, Object> get(UUID id) {
        FinanceCustomer c = requireCustomer(id);
        Instant lastPurchase = resolveLastPurchase(c);
        return toCustomerMap(c, lastPurchase);
    }

    public Map<String, Object> create(UpsertCustomerRequest req) {
        UUID tenant = requireTenant();
        validateUpsert(req, null);
        FinanceCustomer c = new FinanceCustomer();
        c.setId(UUID.randomUUID());
        c.setTenantId(tenant);
        applyUpsert(c, req);
        c.setCreditBalance(BigDecimal.ZERO);
        c.setLoyaltyPoints(0);
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        customerRepository.save(c);
        return toCustomerMap(c, null);
    }

    public Map<String, Object> update(UUID id, UpsertCustomerRequest req) {
        FinanceCustomer c = requireCustomer(id);
        validateUpsert(req, id);
        applyUpsert(c, req);
        c.setUpdatedAt(Instant.now());
        customerRepository.save(c);
        return toCustomerMap(c, resolveLastPurchase(c));
    }

    public void softDelete(UUID id) {
        FinanceCustomer c = requireCustomer(id);
        c.setDeletedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        customerRepository.save(c);
    }

    public List<Map<String, Object>> purchaseHistory(UUID customerId) {
        FinanceCustomer c = requireCustomer(customerId);
        UUID tenant = requireTenant();
        return salesOrderRepository
            .findByTenantIdAndCustomerNameIgnoreCaseOrderByCreatedAtDesc(
                tenant, c.getCustomerName(), PageRequest.of(0, 50))
            .stream()
            .map(o -> toSaleMap(tenant, o))
            .toList();
    }

    public List<Map<String, Object>> creditStatement(UUID customerId) {
        FinanceCustomer c = requireCustomer(customerId);
        UUID tenant = requireTenant();
        ensureLegacyOnAccountCharges(tenant, c);

        List<CustomerCreditLedger> ledger = creditLedgerRepository
            .findByTenantIdAndCustomerIdOrderByCreatedAtDesc(tenant, customerId);

        List<Map<String, Object>> out = new ArrayList<>();
        for (CustomerCreditLedger entry : ledger) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("type", entry.getEntryType());
            row.put("amount", entry.getAmount());
            row.put("runningBalance", entry.getRunningBalance());
            row.put("createdAt", entry.getCreatedAt());
            row.put("description", entry.getNotes() != null ? entry.getNotes() : entry.getReference());
            row.put("reference", entry.getReference());
            out.add(row);
        }

        if (out.isEmpty()) {
            Map<String, Object> balance = new LinkedHashMap<>();
            balance.put("type", "BALANCE");
            balance.put("amount", c.getCreditBalance());
            balance.put("runningBalance", c.getCreditBalance());
            balance.put("createdAt", c.getUpdatedAt() != null ? c.getUpdatedAt() : Instant.now());
            balance.put("description", "Current on-account balance");
            out.add(balance);
        }
        return out;
    }

    public Map<String, Object> recordPayment(UUID customerId, CustomerPaymentRequest req) {
        FinanceCustomer c = lockCustomer(customerId);
        BigDecimal amt = req.amount().setScale(2, RoundingMode.HALF_UP);
        if (amt.signum() <= 0) {
            throw new IllegalArgumentException("Payment amount must be positive");
        }
        BigDecimal bal = c.getCreditBalance() != null ? c.getCreditBalance() : BigDecimal.ZERO;
        if (amt.compareTo(bal) > 0) {
            throw new IllegalArgumentException("Payment amount exceeds outstanding balance of " + bal);
        }
        BigDecimal next = bal.subtract(amt).setScale(2, RoundingMode.HALF_UP);
        c.setCreditBalance(next);
        c.setUpdatedAt(Instant.now());
        customerRepository.save(c);
        appendCreditLedger(c.getId(), "PAYMENT", amt.negate(), next, req.reference(), req.notes(), null);
        return Map.of("customerId", customerId, "creditBalance", c.getCreditBalance());
    }

    public void applyOnAccountCharge(FinanceCustomer customer, BigDecimal amount, UUID salesOrderId) {
        if (amount == null || amount.signum() <= 0) {
            return;
        }
        UUID tenant = requireTenant();
        if (salesOrderId != null && creditLedgerRepository.existsByTenantIdAndCustomerIdAndSalesOrderIdAndEntryType(
            tenant, customer.getId(), salesOrderId, "CHARGE")) {
            return;
        }
        BigDecimal bal = customer.getCreditBalance() != null ? customer.getCreditBalance() : BigDecimal.ZERO;
        BigDecimal next = bal.add(amount).setScale(2, RoundingMode.HALF_UP);
        customer.setCreditBalance(next);
        customer.setUpdatedAt(Instant.now());
        customerRepository.save(customer);
        appendCreditLedger(customer.getId(), "CHARGE", amount, next, null,
            salesOrderId != null ? "POS on-account sale" : "On-account charge", salesOrderId);
    }

    public void applyOnAccountCharge(FinanceCustomer customer, BigDecimal amount) {
        applyOnAccountCharge(customer, amount, null);
    }

    public Map<String, Object> creditAlert(UUID customerId) {
        return creditAlertFor(requireCustomer(customerId));
    }

    private Map<String, Object> creditAlertFor(FinanceCustomer c) {
        BigDecimal limit = c.getCreditLimit() != null ? c.getCreditLimit() : BigDecimal.ZERO;
        BigDecimal bal = c.getCreditBalance() != null ? c.getCreditBalance() : BigDecimal.ZERO;
        boolean alert = false;
        String level = "OK";
        if (limit.signum() > 0) {
            BigDecimal pct = bal.multiply(new BigDecimal("100"))
                .divide(limit, 2, RoundingMode.HALF_UP);
            if (bal.compareTo(limit) >= 0) {
                alert = true;
                level = "EXCEEDED";
            } else if (pct.compareTo(new BigDecimal(creditAlertThresholdPct)) >= 0) {
                alert = true;
                level = "WARNING";
            }
        }
        return Map.of(
            "alert", alert,
            "level", level,
            "creditLimit", limit,
            "creditBalance", bal,
            "thresholdPct", creditAlertThresholdPct
        );
    }

    public int loyaltyDiscountFromPoints(int pointsToRedeem) {
        if (pointsToRedeem <= 0) {
            return 0;
        }
        int blocks = pointsToRedeem / REDEEM_POINTS_BLOCK;
        return REDEEM_VALUE_FRW.multiply(new BigDecimal(blocks)).intValue();
    }

    public void redeemLoyaltyPoints(FinanceCustomer customer, int points) {
        int current = customer.getLoyaltyPoints() != null ? customer.getLoyaltyPoints() : 0;
        if (points > current) {
            throw new IllegalArgumentException("Insufficient loyalty points");
        }
        customer.setLoyaltyPoints(current - points);
        customer.setUpdatedAt(Instant.now());
        customerRepository.save(customer);
        recordLoyaltyTx(customer.getId(), "REDEEM", -points, null, "Checkout redeem");
    }

    public void earnLoyaltyPoints(FinanceCustomer customer, UUID salesOrderId, BigDecimal totalFrw) {
        if (!Boolean.TRUE.equals(customer.getLoyaltyEnabled())) {
            return;
        }
        int earned = totalFrw.divide(new BigDecimal("100"), 0, RoundingMode.DOWN).intValue() * POINTS_PER_100_FRW;
        if (earned <= 0) {
            return;
        }
        int current = customer.getLoyaltyPoints() != null ? customer.getLoyaltyPoints() : 0;
        customer.setLoyaltyPoints(current + earned);
        customer.setUpdatedAt(Instant.now());
        customerRepository.save(customer);
        recordLoyaltyTx(customer.getId(), "EARN", earned, salesOrderId, "Sale earn");
    }

    public List<Map<String, Object>> loyaltyTransactions(UUID customerId) {
        requireCustomer(customerId);
        return loyaltyRepository.findByTenantIdAndCustomerIdOrderByCreatedAtDesc(requireTenant(), customerId)
            .stream()
            .map(tx -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", tx.getId());
                m.put("transactionType", tx.getTransactionType());
                m.put("points", tx.getPoints());
                m.put("amountRwf", tx.getAmountRwf());
                m.put("salesOrderId", tx.getSalesOrderId());
                m.put("notes", tx.getNotes());
                m.put("createdAt", tx.getCreatedAt());
                return m;
            })
            .toList();
    }

    public Map<String, Object> postLoyaltyTransaction(UUID customerId, LoyaltyTransactionRequest req) {
        FinanceCustomer c = lockCustomer(customerId);
        int current = c.getLoyaltyPoints() != null ? c.getLoyaltyPoints() : 0;
        int signedDelta = signedLoyaltyDelta(req.transactionType(), req.points());
        int next = current + signedDelta;
        if (next < 0) {
            throw new IllegalArgumentException("Insufficient loyalty points for this adjustment");
        }
        c.setLoyaltyPoints(next);
        c.setUpdatedAt(Instant.now());
        customerRepository.save(c);
        recordLoyaltyTx(customerId, req.transactionType().trim().toUpperCase(Locale.ROOT), signedDelta, null, req.notes());
        return toCustomerMap(c, resolveLastPurchase(c));
    }

    public List<Map<String, Object>> listLayaways(UUID customerId, String status) {
        requireCustomer(customerId);
        UUID tenant = requireTenant();
        String normalizedStatus = normalizeLayawayStatus(status);
        List<LayawayOrder> rows = normalizedStatus == null
            ? layawayRepository.findByTenantIdAndCustomerIdOrderByCreatedAtDesc(tenant, customerId)
            : layawayRepository.findByTenantIdAndCustomerIdAndStatusOrderByCreatedAtDesc(
                tenant, customerId, normalizedStatus);
        return rows.stream().map(this::toLayawayMap).toList();
    }

    private static String normalizeLayawayStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String s = status.trim().toUpperCase(Locale.ROOT);
        if (!List.of("OPEN", "COLLECTED", "CANCELLED").contains(s)) {
            throw new IllegalArgumentException("Invalid layaway status filter");
        }
        return s;
    }

    public Map<String, Object> createLayaway(UUID customerId, CreateLayawayRequest req) {
        requireCustomer(customerId);
        UUID tenant = requireTenant();
        validateCartJson(req.cartJson());
        BigDecimal total = req.totalAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal deposit = req.depositAmount().setScale(2, RoundingMode.HALF_UP);
        if (deposit.compareTo(total) > 0) {
            throw new IllegalArgumentException("Deposit cannot exceed total amount");
        }
        BigDecimal minDeposit = total.multiply(new BigDecimal("0.30")).setScale(2, RoundingMode.HALF_UP);
        if (deposit.compareTo(minDeposit) < 0) {
            throw new IllegalArgumentException("Minimum deposit is 30% of total (" + minDeposit + ")");
        }
        LayawayOrder order = new LayawayOrder();
        order.setId(UUID.randomUUID());
        order.setTenantId(tenant);
        order.setCustomerId(customerId);
        order.setStatus("OPEN");
        order.setCurrencyCode(req.currencyCode() != null && !req.currencyCode().isBlank() ? req.currencyCode() : "RWF");
        order.setTotalAmount(total);
        order.setDepositAmount(deposit);
        order.setBalanceDue(total.subtract(deposit).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        order.setCollectionDate(req.collectionDate());
        order.setCartJson(req.cartJson());
        order.setCreatedAt(Instant.now());
        order.setUpdatedAt(Instant.now());
        layawayRepository.save(order);
        return toLayawayMap(order);
    }

    public Map<String, Object> recordLayawayPayment(UUID customerId, UUID layawayId, LayawayPaymentRequest req) {
        LayawayOrder order = requireLayaway(customerId, layawayId);
        if (!"OPEN".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("Layaway is not open");
        }
        BigDecimal amount = req.amount().setScale(2, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("Payment amount must be positive");
        }
        if (amount.compareTo(order.getBalanceDue()) > 0) {
            throw new IllegalArgumentException("Payment exceeds remaining balance of " + order.getBalanceDue());
        }
        BigDecimal deposit = order.getDepositAmount().add(amount).setScale(2, RoundingMode.HALF_UP);
        BigDecimal balance = order.getTotalAmount().subtract(deposit).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        order.setDepositAmount(deposit);
        order.setBalanceDue(balance);
        order.setUpdatedAt(Instant.now());
        layawayRepository.save(order);
        return toLayawayMap(order);
    }

    public Map<String, Object> collectLayaway(UUID customerId, UUID layawayId) {
        LayawayOrder order = requireLayaway(customerId, layawayId);
        if (!"OPEN".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("Layaway is not open");
        }
        if (order.getBalanceDue().compareTo(new BigDecimal("0.01")) > 0) {
            throw new IllegalArgumentException("Balance must be paid before collection");
        }
        order.setStatus("COLLECTED");
        order.setUpdatedAt(Instant.now());
        layawayRepository.save(order);
        return toLayawayMap(order);
    }

    public Map<String, Object> cancelLayaway(UUID customerId, UUID layawayId) {
        LayawayOrder order = requireLayaway(customerId, layawayId);
        if (!"OPEN".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalArgumentException("Layaway is not open");
        }
        order.setStatus("CANCELLED");
        order.setUpdatedAt(Instant.now());
        layawayRepository.save(order);
        return toLayawayMap(order);
    }

    private LayawayOrder requireLayaway(UUID customerId, UUID layawayId) {
        requireCustomer(customerId);
        return layawayRepository.findByIdAndTenantId(layawayId, requireTenant())
            .filter(o -> customerId.equals(o.getCustomerId()))
            .orElseThrow(() -> new IllegalArgumentException("Layaway order not found"));
    }

    public List<Map<String, Object>> priceListOptions() {
        return priceListService.listPriceLists().stream()
            .map(row -> {
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("id", row.get("id"));
                out.put("name", row.get("name"));
                return out;
            })
            .toList();
    }

    public FinanceCustomer requireCustomer(UUID id) {
        return customerRepository.findByIdAndTenantId(id, requireTenant())
            .filter(c -> c.getDeletedAt() == null)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
    }

    private Map<String, Object> toSaleMap(UUID tenant, SalesOrder o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("salesOrderId", o.getId());
        m.put("totalAmount", o.getTotalAmount());
        m.put("currencyCode", o.getCurrencyCode());
        m.put("createdAt", o.getCreatedAt());
        m.put("status", o.getStatus());
        m.put("itemSummary", buildItemSummary(tenant, o.getId()));
        m.put("paymentMethod", buildPaymentMethod(tenant, o.getId()));
        return m;
    }

    private String buildItemSummary(UUID tenant, UUID salesOrderId) {
        List<PosSaleLine> lines = saleLineRepository.findByTenantIdAndSalesOrderIdOrderByIdAsc(tenant, salesOrderId);
        if (lines.isEmpty()) {
            return "POS sale";
        }
        String summary = lines.stream()
            .limit(3)
            .map(PosSaleLine::getProductNameSnapshot)
            .filter(Objects::nonNull)
            .filter(s -> !s.isBlank())
            .collect(Collectors.joining(", "));
        if (lines.size() > 3) {
            summary = summary + " +" + (lines.size() - 3) + " more";
        }
        return summary.isBlank() ? "POS sale" : summary;
    }

    private String buildPaymentMethod(UUID tenant, UUID salesOrderId) {
        List<PosPaymentTender> tenders = tenderRepository.findByTenantIdAndSalesOrderIdOrderByCreatedAtAsc(tenant, salesOrderId);
        if (tenders.isEmpty()) {
            return null;
        }
        return tenders.stream()
            .map(PosPaymentTender::getTenderType)
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.joining(" / "));
    }

    private Map<String, Object> toLayawayMap(LayawayOrder order) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", order.getId());
        m.put("status", order.getStatus());
        m.put("currencyCode", order.getCurrencyCode());
        m.put("totalAmount", order.getTotalAmount());
        m.put("depositAmount", order.getDepositAmount());
        m.put("balanceDue", order.getBalanceDue());
        m.put("collectionDate", order.getCollectionDate());
        m.put("salesOrderId", order.getSalesOrderId());
        m.put("createdAt", order.getCreatedAt());
        return m;
    }

    private void ensureLegacyOnAccountCharges(UUID tenant, FinanceCustomer customer) {
        List<SalesOrder> onAccountSales = salesOrderRepository.findOnAccountSalesForCustomer(tenant, customer.getCustomerName());
        for (SalesOrder order : onAccountSales) {
            if (creditLedgerRepository.existsByTenantIdAndCustomerIdAndSalesOrderIdAndEntryType(
                tenant, customer.getId(), order.getId(), "CHARGE")) {
                continue;
            }
            BigDecimal charge = onAccountAmount(tenant, order.getId(), order.getTotalAmount());
            appendCreditLedger(customer.getId(), "CHARGE", charge, null, null,
                "POS on-account sale", order.getId());
        }
        recomputeRunningBalances(tenant, customer.getId());
    }

    private BigDecimal onAccountAmount(UUID tenant, UUID salesOrderId, BigDecimal fallback) {
        List<PosPaymentTender> tenders = tenderRepository.findByTenantIdAndSalesOrderIdOrderByCreatedAtAsc(tenant, salesOrderId);
        BigDecimal sum = tenders.stream()
            .filter(t -> "ON_ACCOUNT".equalsIgnoreCase(t.getTenderType()))
            .map(PosPaymentTender::getAmount)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.signum() > 0 ? sum : (fallback != null ? fallback : BigDecimal.ZERO);
    }

    private void appendCreditLedger(UUID customerId, String entryType, BigDecimal amount, BigDecimal runningBalance,
                                    String reference, String notes, UUID salesOrderId) {
        CustomerCreditLedger row = new CustomerCreditLedger();
        row.setId(UUID.randomUUID());
        row.setTenantId(requireTenant());
        row.setCustomerId(customerId);
        row.setEntryType(entryType);
        row.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
        row.setRunningBalance(runningBalance);
        row.setReference(reference);
        row.setNotes(notes);
        row.setSalesOrderId(salesOrderId);
        row.setCreatedAt(Instant.now());
        creditLedgerRepository.save(row);
        if (runningBalance == null) {
            recomputeRunningBalances(requireTenant(), customerId);
        }
    }

    private void recomputeRunningBalances(UUID tenant, UUID customerId) {
        List<CustomerCreditLedger> rows = creditLedgerRepository.findByTenantIdAndCustomerIdOrderByCreatedAtDesc(tenant, customerId);
        List<CustomerCreditLedger> chronological = new ArrayList<>(rows);
        chronological.sort(Comparator.comparing(CustomerCreditLedger::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        BigDecimal running = BigDecimal.ZERO;
        for (CustomerCreditLedger row : chronological) {
            if ("CHARGE".equalsIgnoreCase(row.getEntryType())) {
                running = running.add(row.getAmount());
            } else if ("PAYMENT".equalsIgnoreCase(row.getEntryType())) {
                running = running.add(row.getAmount());
            } else {
                running = row.getAmount() != null ? row.getAmount() : running;
            }
            row.setRunningBalance(running.setScale(2, RoundingMode.HALF_UP));
            creditLedgerRepository.save(row);
        }
    }

    private int signedLoyaltyDelta(String transactionType, int points) {
        String type = transactionType == null ? "" : transactionType.trim().toUpperCase(Locale.ROOT);
        int magnitude = Math.abs(points);
        return switch (type) {
            case "ADJUST_ADD", "EARN" -> magnitude;
            case "ADJUST_SUB", "REDEEM" -> -magnitude;
            default -> throw new IllegalArgumentException("Unsupported loyalty transaction type: " + type);
        };
    }

    private void recordLoyaltyTx(UUID customerId, String type, int points, UUID saleId, String notes) {
        CustomerLoyaltyTransaction tx = new CustomerLoyaltyTransaction();
        tx.setId(UUID.randomUUID());
        tx.setTenantId(requireTenant());
        tx.setCustomerId(customerId);
        tx.setTransactionType(type);
        tx.setPoints(points);
        tx.setSalesOrderId(saleId);
        tx.setNotes(notes);
        tx.setCreatedAt(Instant.now());
        loyaltyRepository.save(tx);
    }

    private void applyUpsert(FinanceCustomer c, UpsertCustomerRequest req) {
        c.setCustomerName(req.name().trim());
        c.setPhone(normalizePhone(req.phone()));
        c.setEmail(req.email());
        c.setTinNumber(req.tinNumber());
        c.setCustomerType(req.customerType() != null ? req.customerType() : "RETAIL");
        c.setPriceListId(req.priceListId());
        if (req.creditLimit() != null) {
            c.setCreditLimit(req.creditLimit());
        } else if (c.getCreditLimit() == null) {
            c.setCreditLimit(BigDecimal.ZERO);
        }
        if (req.loyaltyEnabled() != null) {
            c.setLoyaltyEnabled(req.loyaltyEnabled());
        } else if (c.getLoyaltyEnabled() == null) {
            c.setLoyaltyEnabled(true);
        }
        c.setNotes(req.notes());
    }

    public Map<String, Object> toCustomerMap(FinanceCustomer c) {
        return toCustomerMap(c, resolveLastPurchase(c));
    }

    private Map<String, Object> toCustomerMap(FinanceCustomer c, Instant lastPurchaseAt) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("name", c.getCustomerName());
        m.put("phone", c.getPhone());
        m.put("email", c.getEmail());
        m.put("tinNumber", c.getTinNumber());
        m.put("customerType", c.getCustomerType());
        m.put("priceListId", c.getPriceListId());
        m.put("creditLimit", c.getCreditLimit());
        m.put("creditBalance", c.getCreditBalance());
        m.put("loyaltyPoints", c.getLoyaltyPoints());
        m.put("loyaltyEnabled", c.getLoyaltyEnabled());
        m.put("taxExempt", c.isTaxExempt());
        m.put("notes", c.getNotes());
        m.put("createdAt", c.getCreatedAt());
        m.put("lastPurchaseAt", lastPurchaseAt);
        m.putAll(creditAlertFor(c));
        return m;
    }

    private FinanceCustomer lockCustomer(UUID id) {
        return customerRepository.findForUpdate(id, requireTenant())
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
    }

    private void validateUpsert(UpsertCustomerRequest req, UUID existingId) {
        if (req.name() == null || req.name().isBlank()) {
            throw new IllegalArgumentException("Customer name is required");
        }
        String phone = normalizePhone(req.phone());
        if (phone != null) {
            customerRepository.findFirstByTenantIdAndPhoneAndDeletedAtIsNull(requireTenant(), phone)
                .filter(c -> existingId == null || !existingId.equals(c.getId()))
                .ifPresent(c -> {
                    throw new IllegalArgumentException("Phone number is already assigned to another customer");
                });
        }
        if (req.creditLimit() != null && req.creditLimit().signum() < 0) {
            throw new IllegalArgumentException("Credit limit cannot be negative");
        }
    }

    private static String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        return phone.trim();
    }

    private void validateCartJson(String cartJson) {
        if (cartJson == null || cartJson.isBlank()) {
            throw new IllegalArgumentException("Layaway cart is required");
        }
        try {
            objectMapper.readTree(cartJson);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Layaway cart must be valid JSON");
        }
    }

    private Instant resolveLastPurchase(FinanceCustomer c) {
        return salesOrderRepository
            .findFirstByTenantIdAndCustomerNameIgnoreCaseOrderByCreatedAtDesc(requireTenant(), c.getCustomerName())
            .map(SalesOrder::getCreatedAt)
            .orElse(null);
    }

    private Map<String, Instant> buildLastPurchaseMap(UUID tenant) {
        Map<String, Instant> out = new HashMap<>();
        for (Object[] row : salesOrderRepository.lastPurchaseGroupedByCustomerName(tenant)) {
            if (row[0] == null || row[1] == null) {
                continue;
            }
            out.put(normalizeNameKey(String.valueOf(row[0])), (Instant) row[1]);
        }
        return out;
    }

    private static String normalizeNameKey(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return tenantId;
    }
}
