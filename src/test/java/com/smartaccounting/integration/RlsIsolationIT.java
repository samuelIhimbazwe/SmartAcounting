package com.smartaccounting.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
class RlsIsolationIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void eventLogInsertsRespectTenantContextWithinTransaction() {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();
        UUID eventA = UUID.randomUUID();
        UUID eventB = UUID.randomUUID();
        UUID aggregateA = UUID.randomUUID();
        UUID aggregateB = UUID.randomUUID();

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> {
            jdbcTemplate.queryForObject("select set_config('app.tenant_id', ?, true)", String.class, tenantA.toString());
            jdbcTemplate.update(
                "insert into event_log (id, tenant_id, aggregate_type, aggregate_id, event_type, payload) values (?, ?, ?, ?, ?, ?::jsonb)",
                eventA, tenantA, "REVENUE", aggregateA, "INVOICE_ISSUED", "{\"amount\":1000}"
            );

            jdbcTemplate.queryForObject("select set_config('app.tenant_id', ?, true)", String.class, tenantB.toString());
            jdbcTemplate.update(
                "insert into event_log (id, tenant_id, aggregate_type, aggregate_id, event_type, payload) values (?, ?, ?, ?, ?, ?::jsonb)",
                eventB, tenantB, "REVENUE", aggregateB, "INVOICE_ISSUED", "{\"amount\":2000}"
            );

            jdbcTemplate.execute("SET LOCAL row_security = off");
            assertEquals(
                2,
                jdbcTemplate.queryForObject(
                    "select count(*) from event_log where id in (?, ?)",
                    Integer.class,
                    eventA,
                    eventB
                )
            );
        });
    }
}
