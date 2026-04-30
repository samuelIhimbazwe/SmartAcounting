package com.smartchain.dashboard;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class HrMarketingAccountingProjector {
    private final JdbcTemplate jdbcTemplate;

    public HrMarketingAccountingProjector(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(cron = "0 0 1 * * *")
    @Scheduled(fixedDelayString = "${smartchain.projection.hma-delay-ms:60000}")
    @Transactional
    public void project() {
        jdbcTemplate.update("""
            INSERT INTO hr_workforce_snapshot (tenant_id, snapshot_date, payload)
            SELECT
                tenant_id, CURRENT_DATE,
                jsonb_build_object(
                    'headcountProxy', COUNT(*),
                    'totalPayrollProxy', COALESCE(SUM(amount),0),
                    'updatedAt', NOW()
                )
            FROM journal_entries
            WHERE deleted_at IS NULL
            GROUP BY tenant_id
            ON CONFLICT (tenant_id, snapshot_date)
            DO UPDATE SET payload = EXCLUDED.payload
            """);

        jdbcTemplate.update("""
            INSERT INTO marketing_roi_snapshot (tenant_id, snapshot_date, payload)
            SELECT
                tenant_id, CURRENT_DATE,
                jsonb_build_object(
                    'spendProxy', COALESCE(SUM(total_amount),0) * 0.1,
                    'attributedRevenueProxy', COALESCE(SUM(total_amount),0),
                    'blendedRoiProxy', 2.4,
                    'updatedAt', NOW()
                )
            FROM sales_orders
            GROUP BY tenant_id
            ON CONFLICT (tenant_id, snapshot_date)
            DO UPDATE SET payload = EXCLUDED.payload
            """);

        jdbcTemplate.update("""
            INSERT INTO accounting_close_snapshot (tenant_id, snapshot_date, payload)
            SELECT
                t.tenant_id, CURRENT_DATE,
                jsonb_build_object(
                    'reconciliationPctComplete', COALESCE(r.recon_pct, 0),
                    'openItemsCount', COALESCE(r.open_items, 0),
                    'journalEntryCountMtd', COALESCE(j.journal_count, 0),
                    'updatedAt', NOW()
                )
            FROM (SELECT DISTINCT tenant_id FROM journal_entries WHERE deleted_at IS NULL) t
            LEFT JOIN (
                SELECT tenant_id,
                       AVG(CASE WHEN status='RECONCILED' THEN 100 ELSE 0 END) as recon_pct,
                       SUM(CASE WHEN status='OPEN_ITEMS' THEN 1 ELSE 0 END) as open_items
                FROM reconciliations
                GROUP BY tenant_id
            ) r ON r.tenant_id = t.tenant_id
            LEFT JOIN (
                SELECT tenant_id, COUNT(*) as journal_count
                FROM journal_entries
                WHERE deleted_at IS NULL
                GROUP BY tenant_id
            ) j ON j.tenant_id = t.tenant_id
            ON CONFLICT (tenant_id, snapshot_date)
            DO UPDATE SET payload = EXCLUDED.payload
            """);
    }
}
