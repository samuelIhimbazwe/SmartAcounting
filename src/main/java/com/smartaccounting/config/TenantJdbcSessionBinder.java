package com.smartaccounting.config;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Applies {@code app.tenant_id} on the JDBC connection used by the current transaction.
 * {@link TenantAwareDataSource} only runs at {@code getConnection()} time; code that sets
 * {@link com.smartaccounting.tenant.TenantContext} mid-transaction (e.g. public signup) must call this.
 */
@Component
public class TenantJdbcSessionBinder {
    private final JdbcTemplate jdbcTemplate;

    public TenantJdbcSessionBinder(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void bind(UUID tenantId) {
        if (tenantId == null) {
            return;
        }
        try {
            jdbcTemplate.queryForObject(
                "select set_config('app.tenant_id', ?, true)",
                String.class,
                tenantId.toString()
            );
        } catch (RuntimeException ex) {
            // Non-Postgres test databases may not support set_config.
        }
    }
}
