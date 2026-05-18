package com.smartaccounting.service;

import com.smartaccounting.dto.CustomerPurchaseHistory;
import com.smartaccounting.entity.CustomerSegment;
import com.smartaccounting.repository.CustomerSegmentRepository;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CustomerSegmentationService {
    private static final Logger log = LoggerFactory.getLogger(CustomerSegmentationService.class);

    private final CustomerSegmentRepository customerSegmentRepository;
    private final TenantService tenantService;
    private final JdbcTemplate jdbcTemplate;

    public CustomerSegmentationService(CustomerSegmentRepository customerSegmentRepository,
                                       TenantService tenantService,
                                       JdbcTemplate jdbcTemplate) {
        this.customerSegmentRepository = customerSegmentRepository;
        this.tenantService = tenantService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(cron = "0 0 1 * * *", zone = "Africa/Kigali")
    public void segmentAllTenants() {
        for (String tenantId : tenantService.findAllActiveTenantIds()) {
            try {
                TenantContext.set(UUID.fromString(tenantId), null);
                segmentCustomers(UUID.fromString(tenantId));
            } catch (Exception ex) {
                log.warn("Customer segmentation failed for tenant {}: {}", tenantId, ex.getMessage());
            } finally {
                TenantContext.clear();
            }
        }
    }

    @Transactional
    public void segmentCustomers(UUID tenantId) {
        LocalDate now = LocalDate.now();
        List<CustomerPurchaseHistory> histories = loadPurchaseHistories(tenantId);
        Map<String, String> phones = loadLatestPhones(tenantId);

        for (CustomerPurchaseHistory history : histories) {
            if (history.lastPurchaseDate() == null) {
                continue;
            }
            String phone = phones.get(history.customerName());
            int recency = calculateRecencyScore(history.lastPurchaseDate(), now);
            int frequency = calculateFrequencyScore(history.transactionCount());
            int monetary = calculateMonetaryScore(history.totalSpend());
            int total = recency + frequency + monetary;
            String segment = determineSegment(recency, frequency, monetary, total,
                history.lastPurchaseDate(), now);

            CustomerSegment cs = customerSegmentRepository
                .findByTenantIdAndCustomerName(tenantId, history.customerName())
                .orElseGet(() -> {
                    CustomerSegment row = new CustomerSegment();
                    row.setId(UUID.randomUUID());
                    row.setTenantId(tenantId);
                    row.setCreatedAt(Instant.now());
                    row.setCurrencyCode("RWF");
                    return row;
                });

            cs.setCustomerName(history.customerName());
            cs.setPhone(phone);
            cs.setTotalSpend(history.totalSpend());
            cs.setTransactionCount(history.transactionCount());
            cs.setAvgOrderValue(history.avgOrderValue());
            cs.setLastPurchaseDate(history.lastPurchaseDate());
            cs.setDaysSincePurchase((int) ChronoUnit.DAYS.between(history.lastPurchaseDate(), now));
            cs.setRfmRecencyScore(recency);
            cs.setRfmFrequencyScore(frequency);
            cs.setRfmMonetaryScore(monetary);
            cs.setRfmTotalScore(total);
            cs.setSegment(segment);
            cs.setLastSegmentedAt(Instant.now());
            customerSegmentRepository.save(cs);
        }

        log.info("Segmented {} customers for tenant {}", histories.size(), tenantId);
    }

    private List<CustomerPurchaseHistory> loadPurchaseHistories(UUID tenantId) {
        return jdbcTemplate.query(
            """
            select customer_name,
                   coalesce(sum(amount), 0) as total_spend,
                   count(*)::int as transaction_count,
                   coalesce(sum(amount) / nullif(count(*), 0), 0) as avg_order_value,
                   max(cast(created_at as date)) as last_purchase_date
            from invoices
            where tenant_id = ?::uuid
              and upper(status) = 'PAID'
              and deleted_at is null
              and customer_name is not null
              and trim(customer_name) <> ''
            group by customer_name
            """,
            (rs, rowNum) -> new CustomerPurchaseHistory(
                rs.getString("customer_name"),
                null,
                rs.getBigDecimal("total_spend"),
                rs.getInt("transaction_count"),
                rs.getBigDecimal("avg_order_value").setScale(4, RoundingMode.HALF_UP),
                rs.getDate("last_purchase_date") != null
                    ? rs.getDate("last_purchase_date").toLocalDate() : null
            ),
            tenantId.toString()
        );
    }

    private Map<String, String> loadLatestPhones(UUID tenantId) {
        List<Map.Entry<String, String>> rows = jdbcTemplate.query(
            """
            select distinct on (coalesce(so.customer_name, ''))
                   coalesce(so.customer_name, '') as customer_name,
                   ppt.payer_phone
            from pos_payment_tenders ppt
            join sales_orders so on so.id = ppt.sales_order_id and so.tenant_id = ppt.tenant_id
            where ppt.tenant_id = ?::uuid
              and ppt.payer_phone is not null
              and trim(ppt.payer_phone) <> ''
              and so.customer_name is not null
              and trim(so.customer_name) <> ''
            order by coalesce(so.customer_name, ''), ppt.created_at desc nulls last
            """,
            (rs, rowNum) -> Map.entry(rs.getString("customer_name"), rs.getString("payer_phone")),
            tenantId.toString()
        );
        Map<String, String> phones = new HashMap<>();
        for (Map.Entry<String, String> row : rows) {
            phones.putIfAbsent(row.getKey(), row.getValue());
        }
        return phones;
    }

    private String determineSegment(int recency, int frequency, int monetary, int total,
                                    LocalDate lastPurchase, LocalDate now) {
        long daysSince = ChronoUnit.DAYS.between(lastPurchase, now);
        if (daysSince <= 30 && total >= 12) return "VIP";
        if (daysSince <= 30 && total >= 9) return "REGULAR";
        if (daysSince <= 60) return "OCCASIONAL";
        if (daysSince <= 90) return "AT_RISK";
        if (daysSince > 90) return "LAPSED";
        return "NEW";
    }

    private int calculateRecencyScore(LocalDate lastPurchase, LocalDate now) {
        long days = ChronoUnit.DAYS.between(lastPurchase, now);
        if (days <= 7) return 5;
        if (days <= 14) return 4;
        if (days <= 30) return 3;
        if (days <= 60) return 2;
        return 1;
    }

    private int calculateFrequencyScore(int count) {
        if (count >= 20) return 5;
        if (count >= 10) return 4;
        if (count >= 5) return 3;
        if (count >= 2) return 2;
        return 1;
    }

    private int calculateMonetaryScore(BigDecimal spend) {
        BigDecimal s = spend == null ? BigDecimal.ZERO : spend;
        if (s.compareTo(new BigDecimal("1000000")) >= 0) return 5;
        if (s.compareTo(new BigDecimal("500000")) >= 0) return 4;
        if (s.compareTo(new BigDecimal("200000")) >= 0) return 3;
        if (s.compareTo(new BigDecimal("50000")) >= 0) return 2;
        return 1;
    }
}
