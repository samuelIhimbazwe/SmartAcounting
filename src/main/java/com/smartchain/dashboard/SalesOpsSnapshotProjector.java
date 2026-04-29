package com.smartchain.dashboard;

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

    @Scheduled(fixedDelayString = "${smartchain.projection.sales-ops-delay-ms:45000}")
    @Transactional
    public void project() {
        jdbcTemplate.update("""
            INSERT INTO sales_kpi_snapshot (tenant_id, snapshot_date, payload)
            SELECT
                tenant_id,
                CURRENT_DATE,
                jsonb_build_object(
                    'orderCount', COUNT(*),
                    'pipelineValue', COALESCE(SUM(total_amount),0),
                    'avgDealSize', COALESCE(AVG(total_amount),0),
                    'updatedAt', NOW()
                )
            FROM sales_orders
            GROUP BY tenant_id
            ON CONFLICT (tenant_id, snapshot_date)
            DO UPDATE SET payload = EXCLUDED.payload
            """);

        jdbcTemplate.update("""
            INSERT INTO ops_kpi_snapshot (tenant_id, snapshot_date, payload)
            SELECT
                tenant_id,
                CURRENT_DATE,
                jsonb_build_object(
                    'purchaseOrderCount', COUNT(*),
                    'procurementSpend', COALESCE(SUM(total_amount),0),
                    'supplierCountProxy', COUNT(DISTINCT supplier_name),
                    'updatedAt', NOW()
                )
            FROM purchase_orders
            GROUP BY tenant_id
            ON CONFLICT (tenant_id, snapshot_date)
            DO UPDATE SET payload = EXCLUDED.payload
            """);
    }
}
