package com.smartaccounting.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Tenant lookups backed by the {@code tenants} table (JdbcTemplate — no JPA entity required).
 */
@Service
public class TenantService {

    private final JdbcTemplate jdbcTemplate;

    public TenantService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * All tenant ids that are active for operations (excludes {@code DISABLED} and similar).
     */
    @Transactional(readOnly = true)
    public List<String> findAllActiveTenantIds() {
        return jdbcTemplate.query(
            """
            select id::text from tenants
            where upper(status) in ('ACTIVE', 'TRIAL')
            order by id
            """,
            (rs, rowNum) -> rs.getString(1)
        );
    }
}
