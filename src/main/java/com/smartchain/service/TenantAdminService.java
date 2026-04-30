package com.smartchain.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TenantAdminService {
    private final JdbcTemplate jdbcTemplate;

    public TenantAdminService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public Map<String, Object> provision(String name) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            "insert into tenants (id, name, status, created_at) values (?, ?, 'ACTIVE', now())",
            id, name
        );
        return Map.of("tenantId", id, "status", "ACTIVE");
    }

    @Transactional
    public Map<String, Object> disable(UUID tenantId) {
        int updated = jdbcTemplate.update(
            "update tenants set status = 'DISABLED', disabled_at = now() where id = ?",
            tenantId
        );
        if (updated == 0) {
            throw new IllegalArgumentException("Tenant not found");
        }
        return Map.of("tenantId", tenantId, "status", "DISABLED", "disabledAt", Instant.now().toString());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        return jdbcTemplate.query(
            "select id, name, status, created_at, disabled_at from tenants order by created_at desc offset ? limit ?",
            (rs, rowNum) -> Map.<String, Object>of(
                "id", UUID.fromString(rs.getString("id")),
                "name", rs.getString("name"),
                "status", rs.getString("status"),
                "createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant()),
                "disabledAt", String.valueOf(rs.getTimestamp("disabled_at") == null ? null : rs.getTimestamp("disabled_at").toInstant())
            ),
            safePage * safeSize,
            safeSize
        );
    }
}
