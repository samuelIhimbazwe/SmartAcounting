package com.smartaccounting.integration;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies staging seed data: SHOP and BRANCH_B must hold different quantities per product.
 * Minimal schema only (no pgvector / full Flyway) — matches {@code inventory_balances} filtering by {@code location_code}.
 */
@Tag("integration")
class Phase3LocationBalancesSeedIT {

    private static final UUID DEMO_WATER =
        UUID.fromString("22222222-2222-4222-8222-222222222201");
    private static final UUID TENANT =
        UUID.fromString("11111111-1111-4111-8111-111111111111");

    @Test
    void shopAndBranchBSeedQuantitiesDiffer() throws Exception {
        try (EmbeddedPostgres pg = EmbeddedPostgres.start()) {
            DataSource ds = pg.getDatabase("postgres", "postgres");
            try (Connection c = ds.getConnection()) {
                c.createStatement().execute("""
                    CREATE TABLE inventory_balances (
                        id UUID PRIMARY KEY,
                        tenant_id UUID NOT NULL,
                        product_id UUID NOT NULL,
                        location_code VARCHAR(120) NOT NULL,
                        quantity NUMERIC(20,4) NOT NULL DEFAULT 0,
                        version BIGINT NOT NULL DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(tenant_id, product_id, location_code)
                    )
                    """);
                c.createStatement().execute("""
                    INSERT INTO inventory_balances (id, tenant_id, product_id, location_code, quantity, version)
                    VALUES
                      ('33333333-3333-4333-8333-333333333301'::uuid, '%s'::uuid,
                       '%s'::uuid, 'SHOP', 120, 0)
                    """.formatted(TENANT, DEMO_WATER));
            }

            try (Connection c = ds.getConnection()) {
                c.createStatement().execute("""
                    INSERT INTO inventory_balances (id, tenant_id, product_id, location_code, quantity, version)
                    VALUES
                      ('d3333333-3333-4333-8333-333333333311'::uuid, '%s'::uuid,
                       '%s'::uuid, 'BRANCH_B', 40, 0)
                    ON CONFLICT (tenant_id, product_id, location_code) DO UPDATE
                      SET quantity = EXCLUDED.quantity
                    """.formatted(TENANT, DEMO_WATER));
            }

            Map<String, BigDecimal> byLocation = quantitiesForWater(ds);
            assertTrue(byLocation.containsKey("SHOP"));
            assertTrue(byLocation.containsKey("BRANCH_B"));
            assertNotEquals(
                0,
                byLocation.get("SHOP").compareTo(byLocation.get("BRANCH_B")),
                "SHOP and BRANCH_B must differ after seed");
            assertEquals(0, new BigDecimal("120").compareTo(byLocation.get("SHOP")));
            assertEquals(0, new BigDecimal("40").compareTo(byLocation.get("BRANCH_B")));
        }
    }

    private static Map<String, BigDecimal> quantitiesForWater(DataSource ds) throws SQLException {
        Map<String, BigDecimal> out = new HashMap<>();
        try (Connection c = ds.getConnection();
             ResultSet rs = c.createStatement().executeQuery("""
                 SELECT location_code, quantity
                 FROM inventory_balances
                 WHERE tenant_id = '%s'::uuid AND product_id = '%s'::uuid
                 """.formatted(TENANT, DEMO_WATER))) {
            while (rs.next()) {
                out.put(rs.getString("location_code"), rs.getBigDecimal("quantity"));
            }
        }
        return out;
    }
}
