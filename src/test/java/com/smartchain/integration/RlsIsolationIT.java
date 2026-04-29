package com.smartchain.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("pgtest")
@EnabledIfEnvironmentVariable(named = "RUN_PG_TESTS", matches = "true")
class RlsIsolationIT {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void eventLogIsTenantIsolatedByRls() {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        UUID eventA = UUID.randomUUID();
        UUID eventB = UUID.randomUUID();
        UUID aggregateA = UUID.randomUUID();
        UUID aggregateB = UUID.randomUUID();

        jdbcTemplate.update("select set_config('app.tenant_id', ?, false)", tenantA.toString());
        jdbcTemplate.update(
            "insert into event_log (id, tenant_id, aggregate_type, aggregate_id, event_type, payload) values (?, ?, ?, ?, ?, ?::jsonb)",
            eventA, tenantA, "REVENUE", aggregateA, "INVOICE_ISSUED", "{\"amount\":1000}"
        );

        jdbcTemplate.update("select set_config('app.tenant_id', ?, false)", tenantB.toString());
        jdbcTemplate.update(
            "insert into event_log (id, tenant_id, aggregate_type, aggregate_id, event_type, payload) values (?, ?, ?, ?, ?, ?::jsonb)",
            eventB, tenantB, "REVENUE", aggregateB, "INVOICE_ISSUED", "{\"amount\":2000}"
        );

        jdbcTemplate.update("select set_config('app.tenant_id', ?, false)", tenantA.toString());
        Integer visibleToA = jdbcTemplate.queryForObject("select count(*) from event_log", Integer.class);

        jdbcTemplate.update("select set_config('app.tenant_id', ?, false)", tenantB.toString());
        Integer visibleToB = jdbcTemplate.queryForObject("select count(*) from event_log", Integer.class);

        assertEquals(1, visibleToA);
        assertEquals(1, visibleToB);
    }
}
