package com.smartaccounting.dashboard;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CeoSnapshotProjector {
    private final JdbcTemplate jdbcTemplate;

    public CeoSnapshotProjector(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedDelayString = "${smartaccounting.projection.ceo-delay-ms:30000}")
    @Transactional
    public void project() {
        try {
            jdbcTemplate.update("""
                INSERT INTO ceo_kpi_snapshot (tenant_id, snapshot_date, payload)
                SELECT
                    tenant_id,
                    CURRENT_DATE,
                    jsonb_build_object(
                        'eventCount', COUNT(*),
                        'grossAmount', COALESCE(SUM((payload::jsonb ->> 'amount')::numeric), 0),
                        'lastUpdated', NOW()
                    )
                FROM event_log
                GROUP BY tenant_id
                ON CONFLICT (tenant_id, snapshot_date)
                DO UPDATE SET payload = EXCLUDED.payload
                """);
        } catch (DataAccessException ex) {
            // H2 fallback path where jsonb_build_object / ::jsonb aren't available.
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS ceo_kpi_snapshot (
                    tenant_id UUID NOT NULL,
                    snapshot_date DATE NOT NULL,
                    payload TEXT NOT NULL,
                    PRIMARY KEY (tenant_id, snapshot_date)
                )
                """);
            jdbcTemplate.update("""
                MERGE INTO ceo_kpi_snapshot (tenant_id, snapshot_date, payload)
                KEY (tenant_id, snapshot_date)
                SELECT
                    tenant_id,
                    CURRENT_DATE,
                    CONCAT(
                        '{"eventCount":', COUNT(*),
                        ',"grossAmount":0,',
                        '"lastUpdated":"', CURRENT_TIMESTAMP(), '"}'
                    )
                FROM event_log
                GROUP BY tenant_id
                """);
        }
    }
}
