package com.smartchain.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class OpsKpiSnapshotJdbcRepository {
    private final JdbcTemplate jdbcTemplate;

    public OpsKpiSnapshotJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<String> findTodayPayload(UUID tenantId) {
        return jdbcTemplate.query(
            "select payload::text from ops_kpi_snapshot where tenant_id = ? and snapshot_date = current_date",
            rs -> rs.next() ? Optional.ofNullable(rs.getString(1)) : Optional.empty(),
            tenantId
        );
    }
}
