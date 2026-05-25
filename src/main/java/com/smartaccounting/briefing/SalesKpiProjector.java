package com.smartaccounting.briefing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.repository.SalesKpiSnapshotJdbcRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Component
public class SalesKpiProjector {
    private static final Logger log = LoggerFactory.getLogger(SalesKpiProjector.class);

    private final SalesKpiSnapshotJdbcRepository salesKpiSnapshotJdbcRepository;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public SalesKpiProjector(
        SalesKpiSnapshotJdbcRepository salesKpiSnapshotJdbcRepository,
        ObjectMapper objectMapper,
        JdbcTemplate jdbcTemplate
    ) {
        this.salesKpiSnapshotJdbcRepository = salesKpiSnapshotJdbcRepository;
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    public double getRevenueToday(UUID tenantId) {
        if (tenantId == null) {
            return 0d;
        }
        try {
            Number n = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(psl.line_total),0) from pos_sale_lines psl
                join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
                where psl.tenant_id = ? and cast(so.created_at as date) = current_date
                """,
                Number.class,
                tenantId
            );
            return n == null ? 0d : n.doubleValue();
        } catch (Exception ex) {
            return 0d;
        }
    }

    public double getRevenueYesterday(UUID tenantId) {
        if (tenantId == null) {
            return 0d;
        }
        try {
            Number n = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(psl.line_total),0) from pos_sale_lines psl
                join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
                where psl.tenant_id = ? and cast(so.created_at as date) = current_date - 1
                """,
                Number.class,
                tenantId
            );
            return n == null ? 0d : n.doubleValue();
        } catch (Exception ex) {
            return 0d;
        }
    }

    /**
     * Ratio of today vs yesterday POS-attributed revenue ({@code 1.0} if yesterday was zero but today is positive).
     */
    public double getRevenueVsYesterdayRatio(UUID tenantId) {
        double y = getRevenueYesterday(tenantId);
        double t = getRevenueToday(tenantId);
        if (y <= 0) {
            return t > 0 ? 1d : 0d;
        }
        return t / y;
    }

    /**
     * Briefing alias for {@link #getRevenueVsYesterdayRatio(UUID)} (today ÷ yesterday, or {@code 0} / {@code 1} edge cases).
     * When a true delta or % change read model is added, replace implementation and drop the delegation.
     */
    public double getRevenueVsYesterday(UUID tenantId) {
        return getRevenueVsYesterdayRatio(tenantId);
    }

    public double getRevenueVsTarget(UUID tenantId) {
        if (tenantId == null) {
            return 0d;
        }
        double today = getRevenueToday(tenantId);
        try {
            Number avg = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(psl.line_total), 0) / 30.0
                from pos_sale_lines psl
                join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
                where psl.tenant_id = ?
                  and so.created_at >= current_timestamp - interval '30 day'
                """,
                Number.class,
                tenantId
            );
            double target = avg == null ? 0d : avg.doubleValue();
            if (target <= 0) {
                return today > 0 ? 1d : 0d;
            }
            return today / target;
        } catch (Exception ex) {
            return 0d;
        }
    }

    public String getTopProduct(UUID tenantId) {
        if (tenantId == null) {
            return "n/a";
        }
        try {
            String name = jdbcTemplate.query(
                """
                select product_name_snapshot from pos_sale_lines where tenant_id = ?
                group by product_name_snapshot
                order by coalesce(sum(line_total),0) desc
                limit 1
                """,
                rs -> rs.next() ? rs.getString(1) : null,
                tenantId
            );
            return name == null || name.isBlank() ? "n/a" : name;
        } catch (Exception ex) {
            return "n/a";
        }
    }

    /** Briefing alias for {@link #getTopProduct(UUID)}. */
    public String getTopSellingProduct(UUID tenantId) {
        return getTopProduct(tenantId);
    }

    public long getNewCustomersToday(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        try {
            Long n = jdbcTemplate.queryForObject(
                """
                select count(*)::bigint from finance_customers
                where tenant_id = ? and (created_at at time zone 'UTC')::date = current_date
                """,
                Long.class,
                tenantId
            );
            return n == null ? 0L : n;
        } catch (Exception ex) {
            return 0L;
        }
    }

    public double getGrossRevenueFromSnapshot(UUID tenantId) {
        if (tenantId == null) {
            return 0d;
        }
        try {
            Optional<String> sales = salesKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (sales.isEmpty()) {
                return 0d;
            }
            JsonNode n = objectMapper.readTree(sales.get());
            return n.path("grossRevenue").asDouble(0);
        } catch (Exception ex) {
            return 0d;
        }
    }

    public BigDecimal getAvgDailySalesByProduct(UUID tenantId, UUID productId) {
        if (tenantId == null || productId == null) {
            return BigDecimal.ONE;
        }
        try {
            Number n = jdbcTemplate.queryForObject(
                """
                select coalesce(sum(psl.quantity), 0) / 30.0
                from pos_sale_lines psl
                join pos_catalog_items pci on pci.id = psl.catalog_item_id and pci.tenant_id = psl.tenant_id
                join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
                where psl.tenant_id = ? and pci.product_id = ?
                  and so.created_at >= current_timestamp - interval '30 day'
                """,
                Number.class,
                tenantId,
                productId
            );
            if (n == null || n.doubleValue() <= 0) {
                return BigDecimal.ONE;
            }
            return new BigDecimal(n.toString()).max(BigDecimal.ONE);
        } catch (Exception ex) {
            return BigDecimal.ONE;
        }
    }

    public double getRevenuePerEmployee(UUID tenantId, long headcount) {
        if (headcount <= 0) {
            return 0d;
        }
        double rev = getGrossRevenueFromSnapshot(tenantId);
        return rev / headcount;
    }
}
