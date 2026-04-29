package com.smartchain.dashboard;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CeoSnapshotProjector {
    private final JdbcTemplate jdbcTemplate;

    public CeoSnapshotProjector(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedDelayString = "${smartchain.projection.ceo-delay-ms:30000}")
    @Transactional
    public void project() {
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
    }
}
