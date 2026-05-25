package com.smartaccounting.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * HQ / branch analytics aggregates from POS, inventory, payroll, and AR/AP read models.
 */
@Repository
public class AnalyticsDashboardJdbcRepository {
    private static final String SALE_LOCATION_JOINS = """
        left join till_sessions ts on ts.id = so.till_session_id and ts.tenant_id = so.tenant_id
        left join registers reg on reg.tenant_id = so.tenant_id and reg.name = so.pos_register_code
        """;

    private static final String COMPLETED_SALES = " and upper(so.status) = 'COMPLETED' ";

    private final JdbcTemplate jdbcTemplate;

    public AnalyticsDashboardJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public BigDecimal sumSalesToday(UUID tenantId, UUID locationId) {
        String locationFilter = locationId == null ? "" : " and coalesce(ts.location_id, reg.location_id) = ? ";
        Object[] args = locationId == null
            ? new Object[]{tenantId}
            : new Object[]{tenantId, locationId};
        return jdbcTemplate.queryForObject(
            """
            select coalesce(sum(psl.line_total), 0)
            from pos_sale_lines psl
            join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
            """
                + SALE_LOCATION_JOINS
                + """
            where psl.tenant_id = ?
            """
                + locationFilter
                + COMPLETED_SALES
                + " and cast(so.created_at as date) = current_date",
            BigDecimal.class,
            args
        );
    }

    public int countVoidsToday(UUID tenantId, UUID locationId) {
        if (locationId == null) {
            Integer n = jdbcTemplate.queryForObject(
                """
                select count(*)::int from pos_returns
                where tenant_id = ? and return_date = current_date
                """,
                Integer.class,
                tenantId
            );
            return n != null ? n : 0;
        }
        Integer n = jdbcTemplate.queryForObject(
            """
            select count(*)::int from pos_returns pr
            join registers r on r.tenant_id = pr.tenant_id and r.name = pr.till_code
            where pr.tenant_id = ? and pr.return_date = current_date and r.location_id = ?
            """,
            Integer.class,
            tenantId,
            locationId
        );
        return n != null ? n : 0;
    }

    public int countOpenTills(UUID tenantId, UUID locationId) {
        if (locationId == null) {
            Integer n = jdbcTemplate.queryForObject(
                "select count(*)::int from till_sessions where tenant_id = ? and status = 'OPEN'",
                Integer.class,
                tenantId
            );
            return n != null ? n : 0;
        }
        Integer n = jdbcTemplate.queryForObject(
            """
            select count(*)::int from till_sessions
            where tenant_id = ? and status = 'OPEN' and location_id = ?
            """,
            Integer.class,
            tenantId,
            locationId
        );
        return n != null ? n : 0;
    }

    public int countCashiersToday(UUID tenantId, UUID locationId) {
        if (locationId == null) {
            Integer n = jdbcTemplate.queryForObject(
                """
                select count(distinct cashier_id)::int from cashier_performance
                where tenant_id = ? and shift_date = current_date
                """,
                Integer.class,
                tenantId
            );
            return n != null ? n : 0;
        }
        Integer n = jdbcTemplate.queryForObject(
            """
            select count(distinct ts.cashier_id)::int
            from till_sessions ts
            where ts.tenant_id = ? and ts.status = 'OPEN' and ts.location_id = ?
            """,
            Integer.class,
            tenantId,
            locationId
        );
        return n != null ? n : 0;
    }

    public List<Map<String, Object>> revenueByDay(UUID tenantId, UUID locationId, LocalDate start, LocalDate end) {
        String locationFilter = locationId == null ? "" : " and coalesce(ts.location_id, reg.location_id) = ? ";
        Object[] args = locationId == null
            ? new Object[]{tenantId, start, end}
            : new Object[]{tenantId, locationId, start, end};
        return jdbcTemplate.query(
            """
            select cast(so.created_at as date) as day,
                   coalesce(sum(psl.line_total), 0) as revenue
            from pos_sale_lines psl
            join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
            """
                + SALE_LOCATION_JOINS
                + """
            where psl.tenant_id = ?
            """
                + locationFilter
                + COMPLETED_SALES
                + """
              and cast(so.created_at as date) between ? and ?
            group by cast(so.created_at as date)
            order by day
            """,
            (rs, rowNum) -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("date", rs.getDate("day").toLocalDate().toString());
                row.put("revenue", rs.getBigDecimal("revenue"));
                return row;
            },
            args
        );
    }

    public BigDecimal cogsLast30Days(UUID tenantId) {
        return jdbcTemplate.queryForObject(
            """
            select coalesce(sum(psl.quantity * coalesce(psl.cost_price, 0)), 0)
            from pos_sale_lines psl
            join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
            where psl.tenant_id = ?
              and so.created_at >= current_timestamp - interval '30 day'
            """
                + COMPLETED_SALES,
            BigDecimal.class,
            tenantId
        );
    }

    public BigDecimal averageInventoryQuantity(UUID tenantId) {
        BigDecimal stockLevelsAvg = jdbcTemplate.queryForObject(
            """
            select coalesce(avg(qty), 0)
            from stock_levels
            where tenant_id = ?
            """,
            BigDecimal.class,
            tenantId
        );
        if (stockLevelsAvg != null && stockLevelsAvg.compareTo(BigDecimal.ZERO) > 0) {
            return stockLevelsAvg;
        }
        return jdbcTemplate.queryForObject(
            """
            select coalesce(avg(quantity), 0)
            from inventory_balances
            where tenant_id = ?
            """,
            BigDecimal.class,
            tenantId
        );
    }

    public Optional<PayrollTotalsRow> latestPayrollForPeriod(UUID tenantId, String period) {
        return jdbcTemplate.query(
            """
            select coalesce(total_gross, 0) as gross,
                   coalesce(total_net, 0) as net,
                   coalesce(total_paye, 0) as paye,
                   coalesce(employee_count, 0) as employees
            from payroll_runs
            where tenant_id = ?
              and period = ?
              and upper(status) in ('APPROVED', 'POSTED', 'PAID')
            order by created_at desc
            limit 1
            """,
            rs -> rs.next()
                ? Optional.of(new PayrollTotalsRow(
                    rs.getBigDecimal("gross"),
                    rs.getBigDecimal("net"),
                    rs.getBigDecimal("paye"),
                    rs.getInt("employees")))
                : Optional.empty(),
            tenantId,
            period
        );
    }

    public Optional<ArApSnapshotRow> latestArApSnapshot(UUID tenantId) {
        return jdbcTemplate.query(
            """
            select
              coalesce(receivable_current, 0) + coalesce(receivable_30, 0)
                + coalesce(receivable_60, 0) + coalesce(receivable_90_plus, 0) as ar_total,
              coalesce(payable_current, 0) + coalesce(payable_30, 0)
                + coalesce(payable_60, 0) + coalesce(payable_90_plus, 0) as ap_total,
              snapshot_date
            from ar_ap_aging_snapshot
            where tenant_id = ?
            order by snapshot_date desc
            limit 1
            """,
            rs -> rs.next()
                ? Optional.of(new ArApSnapshotRow(
                    rs.getBigDecimal("ar_total"),
                    rs.getBigDecimal("ap_total"),
                    rs.getDate("snapshot_date").toLocalDate()))
                : Optional.empty(),
            tenantId
        );
    }

    public BigDecimal sumOpenInvoices(UUID tenantId) {
        return jdbcTemplate.queryForObject(
            """
            select coalesce(sum(amount), 0) from invoices
            where tenant_id = ? and deleted_at is null and status = 'OPEN'
            """,
            BigDecimal.class,
            tenantId
        );
    }

    public BigDecimal sumOpenSupplierBills(UUID tenantId) {
        return jdbcTemplate.queryForObject(
            """
            select coalesce(sum(amount), 0) from supplier_bills
            where tenant_id = ? and deleted_at is null and status = 'OPEN'
            """,
            BigDecimal.class,
            tenantId
        );
    }

    public List<Map<String, Object>> locationBreakdown(UUID tenantId) {
        return jdbcTemplate.query(
            """
            select l.id, l.name,
                   coalesce(s.sales_today, 0) as sales_today,
                   coalesce(v.voids, 0) as voids,
                   coalesce(t.open_tills, 0) as open_tills
            from locations l
            left join (
                select coalesce(ts.location_id, reg.location_id) as location_id,
                       sum(psl.line_total) as sales_today
                from sales_orders so
                join pos_sale_lines psl on psl.sales_order_id = so.id and psl.tenant_id = so.tenant_id
                left join till_sessions ts on ts.id = so.till_session_id and ts.tenant_id = so.tenant_id
                left join registers reg on reg.tenant_id = so.tenant_id and reg.name = so.pos_register_code
                where so.tenant_id = ?
                  and cast(so.created_at as date) = current_date
                  and upper(so.status) = 'COMPLETED'
                group by coalesce(ts.location_id, reg.location_id)
            ) s on s.location_id = l.id
            left join (
                select r.location_id, count(pr.id) as voids
                from pos_returns pr
                join registers r on r.tenant_id = pr.tenant_id and r.name = pr.till_code
                where pr.tenant_id = ? and pr.return_date = current_date
                group by r.location_id
            ) v on v.location_id = l.id
            left join (
                select location_id, count(*) as open_tills
                from till_sessions
                where tenant_id = ? and status = 'OPEN'
                group by location_id
            ) t on t.location_id = l.id
            where l.tenant_id = ? and l.is_active = true
            order by l.name
            """,
            (rs, rowNum) -> {
                Map<String, Object> loc = new LinkedHashMap<>();
                loc.put("locationId", UUID.fromString(rs.getString("id")));
                loc.put("name", rs.getString("name"));
                loc.put("salesToday", rs.getBigDecimal("sales_today"));
                loc.put("voids", rs.getInt("voids"));
                loc.put("openTills", rs.getInt("open_tills"));
                return loc;
            },
            tenantId,
            tenantId,
            tenantId,
            tenantId
        );
    }

    public List<Map<String, Object>> lowStockAlerts(UUID tenantId, UUID locationId, int limit) {
        String locationFilter = locationId == null ? "" : " and sl.location_id = ? ";
        Object[] args = locationId == null
            ? new Object[]{tenantId, limit}
            : new Object[]{tenantId, locationId, limit};
        return jdbcTemplate.query(
            """
            select sl.product_id, coalesce(p.name, sl.product_id::text) as product_name,
                   sl.qty, sl.reorder_point
            from stock_levels sl
            left join products p on p.id = sl.product_id and p.tenant_id = sl.tenant_id
            where sl.tenant_id = ?
            """
                + locationFilter
                + """
              and sl.qty <= sl.reorder_point and sl.reorder_point > 0
            order by sl.qty asc
            limit ?
            """,
            (rs, rowNum) -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("productId", UUID.fromString(rs.getString("product_id")));
                row.put("productName", rs.getString("product_name"));
                row.put("qty", rs.getBigDecimal("qty"));
                row.put("reorderPoint", rs.getBigDecimal("reorder_point"));
                return row;
            },
            args
        );
    }

    public List<Map<String, Object>> topProductsToday(UUID tenantId, UUID locationId, int limit) {
        String locationFilter = locationId == null ? "" : " and coalesce(ts.location_id, reg.location_id) = ? ";
        Object[] args = locationId == null
            ? new Object[]{tenantId, limit}
            : new Object[]{tenantId, locationId, limit};
        return jdbcTemplate.query(
            """
            select psl.product_name_snapshot as name,
                   coalesce(sum(psl.line_total), 0) as revenue
            from pos_sale_lines psl
            join sales_orders so on so.id = psl.sales_order_id and so.tenant_id = psl.tenant_id
            """
                + SALE_LOCATION_JOINS
                + """
            where psl.tenant_id = ?
            """
                + locationFilter
                + COMPLETED_SALES
                + """
              and cast(so.created_at as date) = current_date
            group by psl.product_name_snapshot
            order by revenue desc
            limit ?
            """,
            (rs, rowNum) -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("name", rs.getString("name"));
                row.put("revenue", rs.getBigDecimal("revenue"));
                return row;
            },
            args
        );
    }

    public record PayrollTotalsRow(BigDecimal gross, BigDecimal net, BigDecimal paye, int employees) {}

    public record ArApSnapshotRow(BigDecimal arTotal, BigDecimal apTotal, LocalDate snapshotDate) {}
}
