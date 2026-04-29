package com.smartchain.dashboard;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class FinancialSnapshotProjector {
    private final JdbcTemplate jdbcTemplate;

    public FinancialSnapshotProjector(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedDelayString = "${smartchain.projection.cfo-delay-ms:45000}")
    @Transactional
    public void projectCfo() {
        jdbcTemplate.update("""
            INSERT INTO cfo_kpi_snapshot (tenant_id, snapshot_date, payload)
            SELECT
                tenant_id,
                CURRENT_DATE,
                jsonb_build_object(
                    'journalVolume', COUNT(*),
                    'ledgerAmount', COALESCE(SUM(amount), 0),
                    'quickRatioProxy', CASE WHEN COALESCE(SUM(amount),0)=0 THEN 1 ELSE 1.2 END,
                    'updatedAt', NOW()
                )
            FROM journal_entries
            WHERE deleted_at IS NULL
            GROUP BY tenant_id
            ON CONFLICT (tenant_id, snapshot_date)
            DO UPDATE SET payload = EXCLUDED.payload
            """);

        jdbcTemplate.update("""
            INSERT INTO ar_ap_aging_snapshot (
                tenant_id, snapshot_date,
                receivable_current, receivable_30, receivable_60, receivable_90_plus,
                payable_current, payable_30, payable_60, payable_90_plus
            )
            SELECT
                t.tenant_id, CURRENT_DATE,
                COALESCE(ar.current_bucket, 0),
                COALESCE(ar.bucket_30, 0),
                COALESCE(ar.bucket_60, 0),
                COALESCE(ar.bucket_90, 0),
                COALESCE(ap.current_bucket, 0),
                COALESCE(ap.bucket_30, 0),
                COALESCE(ap.bucket_60, 0),
                COALESCE(ap.bucket_90, 0)
            FROM (
                SELECT tenant_id FROM invoices WHERE deleted_at IS NULL
                UNION
                SELECT tenant_id FROM supplier_bills WHERE deleted_at IS NULL
            ) t
            LEFT JOIN (
                SELECT
                    tenant_id,
                    SUM(CASE WHEN due_date >= CURRENT_DATE THEN amount ELSE 0 END) AS current_bucket,
                    SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 day' THEN amount ELSE 0 END) AS bucket_30,
                    SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 day' AND due_date >= CURRENT_DATE - INTERVAL '60 day' THEN amount ELSE 0 END) AS bucket_60,
                    SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 day' THEN amount ELSE 0 END) AS bucket_90
                FROM invoices
                WHERE status = 'OPEN' AND deleted_at IS NULL
                GROUP BY tenant_id
            ) ar ON ar.tenant_id = t.tenant_id
            LEFT JOIN (
                SELECT
                    tenant_id,
                    SUM(CASE WHEN due_date >= CURRENT_DATE THEN amount ELSE 0 END) AS current_bucket,
                    SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 day' THEN amount ELSE 0 END) AS bucket_30,
                    SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 day' AND due_date >= CURRENT_DATE - INTERVAL '60 day' THEN amount ELSE 0 END) AS bucket_60,
                    SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 day' THEN amount ELSE 0 END) AS bucket_90
                FROM supplier_bills
                WHERE status = 'OPEN' AND deleted_at IS NULL
                GROUP BY tenant_id
            ) ap ON ap.tenant_id = t.tenant_id
            ON CONFLICT (tenant_id, snapshot_date)
            DO UPDATE SET
                receivable_current = EXCLUDED.receivable_current,
                receivable_30 = EXCLUDED.receivable_30,
                receivable_60 = EXCLUDED.receivable_60,
                receivable_90_plus = EXCLUDED.receivable_90_plus,
                payable_current = EXCLUDED.payable_current,
                payable_30 = EXCLUDED.payable_30,
                payable_60 = EXCLUDED.payable_60,
                payable_90_plus = EXCLUDED.payable_90_plus
            """);
    }
}
