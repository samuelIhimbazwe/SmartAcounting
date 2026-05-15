package com.smartaccounting.dashboard;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SalesOpsSnapshotProjector {
    private final JdbcTemplate jdbcTemplate;

    public SalesOpsSnapshotProjector(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedDelayString = "${smartaccounting.projection.sales-ops-delay-ms:45000}")
    @Transactional
    public void project() {
        try {
            jdbcTemplate.update("""
                INSERT INTO sales_kpi_snapshot (tenant_id, snapshot_date, payload)
                SELECT
                    tenant_id,
                    CURRENT_DATE,
                    jsonb_build_object(
                        'orderCount', COUNT(*),
                        'pipelineValue', COALESCE(SUM(total_amount),0),
                        'avgDealSize', COALESCE(AVG(total_amount),0),
                        'grossRevenue', COALESCE((
                            SELECT SUM(psl.line_total)
                            FROM pos_sale_lines psl
                            JOIN sales_orders so2 ON so2.id = psl.sales_order_id
                            WHERE so2.tenant_id = sales_orders.tenant_id
                        ), 0),
                        'historicalCogs', COALESCE((
                            SELECT SUM(psl.quantity * COALESCE(psl.cost_price,0))
                            FROM pos_sale_lines psl
                            JOIN sales_orders so2 ON so2.id = psl.sales_order_id
                            WHERE so2.tenant_id = sales_orders.tenant_id
                        ), 0),
                        'grossMargin', COALESCE((
                            SELECT SUM(psl.line_total - (psl.quantity * COALESCE(psl.cost_price,0)))
                            FROM pos_sale_lines psl
                            JOIN sales_orders so2 ON so2.id = psl.sales_order_id
                            WHERE so2.tenant_id = sales_orders.tenant_id
                        ), 0),
                        'lostSalesThisWeek', COALESCE((
                            SELECT SUM(ls.estimated_lost_revenue)
                            FROM lost_sales ls
                            WHERE ls.tenant_id = sales_orders.tenant_id
                              AND ls.attempted_at >= date_trunc('week', CURRENT_DATE)
                        ), 0),
                        'topCashierToday', COALESCE((
                            SELECT cp.cashier_name
                            FROM cashier_performance cp
                            WHERE cp.tenant_id = sales_orders.tenant_id
                              AND cp.shift_date = CURRENT_DATE
                            ORDER BY cp.total_sales DESC
                            LIMIT 1
                        ), 'N/A'),
                        'updatedAt', NOW()
                    )
                FROM sales_orders
                GROUP BY tenant_id
                ON CONFLICT (tenant_id, snapshot_date)
                DO UPDATE SET payload = EXCLUDED.payload
                """);

            jdbcTemplate.update("""
                INSERT INTO ops_kpi_snapshot (tenant_id, snapshot_date, payload)
                WITH tenants AS (
                    SELECT DISTINCT tenant_id FROM purchase_orders
                    UNION
                    SELECT DISTINCT tenant_id FROM inventory_balances
                ),
                po AS (
                    SELECT
                        tenant_id,
                        COUNT(*) AS purchase_order_count,
                        COALESCE(SUM(total_amount),0) AS procurement_spend,
                        COUNT(DISTINCT supplier_name) AS supplier_count_proxy
                    FROM purchase_orders
                    GROUP BY tenant_id
                ),
                low_stock AS (
                    SELECT
                        b.tenant_id,
                        COUNT(*) AS low_stock_count
                    FROM inventory_balances b
                    JOIN (
                        SELECT tenant_id, product_id, MAX(reorder_point) AS reorder_point
                        FROM pos_catalog_items
                        WHERE active = TRUE AND reorder_point IS NOT NULL AND reorder_point > 0
                        GROUP BY tenant_id, product_id
                    ) r ON r.tenant_id = b.tenant_id AND r.product_id = b.product_id
                    WHERE b.location_code = 'SHOP'
                      AND b.quantity <= r.reorder_point
                    GROUP BY b.tenant_id
                ),
                expiry_risk AS (
                    SELECT
                        ib.tenant_id,
                        COUNT(*) AS expiry_risk_count_30d
                    FROM inventory_batches ib
                    WHERE ib.location_code = 'SHOP'
                      AND ib.quantity_on_hand > 0
                      AND ib.expiry_date IS NOT NULL
                      AND ib.expiry_date <= CURRENT_DATE + 30
                    GROUP BY ib.tenant_id
                )
                SELECT
                    t.tenant_id,
                    CURRENT_DATE,
                    jsonb_build_object(
                        'purchaseOrderCount', COALESCE(po.purchase_order_count, 0),
                        'procurementSpend', COALESCE(po.procurement_spend, 0),
                        'supplierCountProxy', COALESCE(po.supplier_count_proxy, 0),
                        'lowStockCount', COALESCE(ls.low_stock_count, 0),
                        'expiryRiskCount30d', COALESCE(er.expiry_risk_count_30d, 0),
                        'updatedAt', NOW()
                    )
                FROM tenants t
                LEFT JOIN po ON po.tenant_id = t.tenant_id
                LEFT JOIN low_stock ls ON ls.tenant_id = t.tenant_id
                LEFT JOIN expiry_risk er ON er.tenant_id = t.tenant_id
                ON CONFLICT (tenant_id, snapshot_date)
                DO UPDATE SET payload = EXCLUDED.payload
                """);
        } catch (DataAccessException ex) {
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS sales_kpi_snapshot (
                    tenant_id UUID NOT NULL,
                    snapshot_date DATE NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (tenant_id, snapshot_date)
                )
                """);
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS ops_kpi_snapshot (
                    tenant_id UUID NOT NULL,
                    snapshot_date DATE NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (tenant_id, snapshot_date)
                )
                """);
            jdbcTemplate.update("""
                MERGE INTO sales_kpi_snapshot (tenant_id, snapshot_date, payload)
                KEY (tenant_id, snapshot_date)
                SELECT tenant_id, CURRENT_DATE,
                       CONCAT('{"orderCount":', COUNT(*),
                              ',"pipelineValue":', COALESCE(SUM(total_amount),0),
                              ',"avgDealSize":', COALESCE(AVG(total_amount),0),
                              ',"grossRevenue":0,"historicalCogs":0,"grossMargin":0}')
                FROM sales_orders
                GROUP BY tenant_id
                """);
        }
    }
}
