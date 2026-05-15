package com.smartaccounting.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class CfoKpiSnapshotJdbcRepository {
    private final JdbcTemplate jdbcTemplate;

    public CfoKpiSnapshotJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<String> findTodayPayload(UUID tenantId) {
        try {
            return jdbcTemplate.query(
                "select payload::text from cfo_kpi_snapshot where tenant_id = ? and snapshot_date = current_date",
                rs -> rs.next() ? Optional.ofNullable(rs.getString(1)) : Optional.empty(),
                tenantId
            );
        } catch (Exception ex) {
            return jdbcTemplate.query(
                "select payload from cfo_kpi_snapshot where tenant_id = ? and snapshot_date = current_date",
                rs -> rs.next() ? Optional.ofNullable(rs.getString(1)) : Optional.empty(),
                tenantId.toString()
            );
        }
    }
}
