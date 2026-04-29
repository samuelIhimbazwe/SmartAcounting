package com.smartchain.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public class MarketingKpiSnapshotJdbcRepository {
    private final JdbcTemplate jdbcTemplate;
    public MarketingKpiSnapshotJdbcRepository(JdbcTemplate jdbcTemplate) { this.jdbcTemplate = jdbcTemplate; }
    public Optional<String> findTodayPayload(UUID tenantId) {
        return jdbcTemplate.query(
            "select payload::text from marketing_roi_snapshot where tenant_id = ? and snapshot_date = current_date",
            rs -> rs.next() ? Optional.ofNullable(rs.getString(1)) : Optional.empty(),
            tenantId
        );
    }
}
