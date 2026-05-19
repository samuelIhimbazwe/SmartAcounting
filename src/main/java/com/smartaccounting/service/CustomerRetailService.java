package com.smartaccounting.service;

import com.smartaccounting.dto.CustomerPaymentRequest;
import com.smartaccounting.dto.LoyaltyTransactionRequest;
import com.smartaccounting.dto.UpsertCustomerRequest;
import com.smartaccounting.entity.CustomerLoyaltyTransaction;
import com.smartaccounting.entity.FinanceCustomer;
import com.smartaccounting.entity.LayawayOrder;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.entity.SalesQuote;
import com.smartaccounting.repository.CustomerLoyaltyTransactionRepository;
import com.smartaccounting.repository.FinanceCustomerRepository;
import com.smartaccounting.repository.LayawayOrderRepository;
import com.smartaccounting.repository.SalesOrderRepository;
import com.smartaccounting.repository.SalesQuoteRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Value;
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
@Transactional
public class CustomerRetailService {
    public static final int POINTS_PER_100_FRW = 1;
    public static final int REDEEM_POINTS_BLOCK = 100;
    public static final BigDecimal REDEEM_VALUE_FRW = new BigDecimal("500");

    private final FinanceCustomerRepository customerRepository;
    private final CustomerLoyaltyTransactionRepository loyaltyRepository;
    private final SalesOrderRepository salesOrderRepository;
    private final LayawayOrderRepository layawayRepository;
    private final SalesQuoteRepository quoteRepository;
    private final ReceivablesPayablesService receivablesPayablesService;

    @Value("${retail.credit-alert-threshold-pct:80}")
    private int creditAlertThresholdPct;

    public CustomerRetailService(FinanceCustomerRepository customerRepository,
                                 CustomerLoyaltyTransactionRepository loyaltyRepository,
                                 SalesOrderRepository salesOrderRepository,
                                 LayawayOrderRepository layawayRepository,
                                 SalesQuoteRepository quoteRepository,
                                 ReceivablesPayablesService receivablesPayablesService) {
        this.customerRepository = customerRepository;
        this.loyaltyRepository = loyaltyRepository;
        this.salesOrderRepository = salesOrderRepository;
        this.layawayRepository = layawayRepository;
        this.quoteRepository = quoteRepository;
        this.receivablesPayablesService = receivablesPayablesService;
    }

    public List<Map<String, Object>> search(String q) {
        UUID tenant = requireTenant();
        String term = q == null ? "" : q.trim();
        List<FinanceCustomer> rows = term.isEmpty()
            ? customerRepository.findAll().stream()
                .filter(c -> tenant.equals(c.getTenantId()) && c.getDeletedAt() == null)
                .toList()
            : customerRepository.search(tenant, term);
        return rows.stream().map(this::toCustomerMap).toList();
    }

    public Map<String, Object> get(UUID id) {
        return toCustomerMap(requireCustomer(id));
    }

    public Map<String, Object> create(UpsertCustomerRequest req) {
        UUID tenant = requireTenant();
        FinanceCustomer c = new FinanceCustomer();
        c.setId(UUID.randomUUID());
        c.setTenantId(tenant);
        applyUpsert(c, req);
        c.setCreditBalance(BigDecimal.ZERO);
        c.setLoyaltyPoints(0);
        c.setCreatedAt(Instant.now());
        c.setUpdatedAt(Instant.now());
        customerRepository.save(c);
        return toCustomerMap(c);
    }

    public Map<String, Object> update(UUID id, UpsertCustomerRequest req) {
        FinanceCustomer c = requireCustomer(id);
        applyUpsert(c, req);
        c.setUpdatedAt(Instant.now());
        customerRepository.save(c);
        return toCustomerMap(c);
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
        return salesOrderRepository.findAll().stream()
            .filter(o -> tenant.equals(o.getTenantId())
                && c.getCustomerName().equalsIgnoreCase(o.getCustomerName()))
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .limit(50)
            .map(o -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("salesOrderId", o.getId());
                m.put("totalAmount", o.getTotalAmount());
                m.put("currencyCode", o.getCurrencyCode());
                m.put("createdAt", o.getCreatedAt());
                return m;
            })
            .toList();
    }

    public List<Map<String, Object>> creditStatement(UUID customerId) {
        requireCustomer(customerId);
        List<Map<String, Object>> out = new ArrayList<>();
        FinanceCustomer c = requireCustomer(customerId);
        Map<String, Object> balance = new LinkedHashMap<>();
        balance.put("type", "BALANCE");
        balance.put("amount", c.getCreditBalance());
        balance.put("runningBalance", c.getCreditBalance());
        balance.put("createdAt", Instant.now());
        out.add(balance);
        return out;
    }

    public Map<String, Object> recordPayment(UUID customerId, CustomerPaymentRequest req) {
        FinanceCustomer c = requireCustomer(customerId);
        BigDecimal amt = req.amount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal bal = c.getCreditBalance() != null ? c.getCreditBalance() : BigDecimal.ZERO;
        c.setCreditBalance(bal.subtract(amt).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
        c.setUpdatedAt(Instant.now());
        customerRepository.save(c);
        return Map.of("customerId", customerId, "creditBalance", c.getCreditBalance());
    }

    public void applyOnAccountCharge(FinanceCustomer customer, BigDecimal amount) {
        BigDecimal bal = customer.getCreditBalance() != null ? customer.getCreditBalance() : BigDecimal.ZERO;
        customer.setCreditBalance(bal.add(amount).setScale(2, RoundingMode.HALF_UP));
        customer.setUpdatedAt(Instant.now());
        customerRepository.save(customer);
    }

    public Map<String, Object> creditAlert(UUID customerId) {
        FinanceCustomer c = requireCustomer(customerId);
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
        requireCustomer(customerId);
        recordLoyaltyTx(customerId, req.transactionType(), req.points(), null, req.notes());
        return get(customerId);
    }

    public FinanceCustomer requireCustomer(UUID id) {
        return customerRepository.findByIdAndTenantId(id, requireTenant())
            .filter(c -> c.getDeletedAt() == null)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
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
        c.setPhone(req.phone());
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
        m.putAll(creditAlert(c.getId()));
        return m;
    }

    private UUID requireTenant() {
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return tenantId;
    }
}
