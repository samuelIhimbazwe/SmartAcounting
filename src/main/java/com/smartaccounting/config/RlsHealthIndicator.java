package com.smartaccounting.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

@Component
public class RlsHealthIndicator implements HealthIndicator {
    private final DataSource dataSource;

    public RlsHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try (Connection c = dataSource.getConnection();
             Statement s = c.createStatement()) {
            if (!isPostgres(c)) {
                return Health.up().withDetail("rls", "skipped_non_postgres").build();
            }
            s.execute("select set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true)");
            try (ResultSet rs = s.executeQuery("select current_setting('app.tenant_id', true)")) {
                if (rs.next()) {
                    String value = rs.getString(1);
                    if ("00000000-0000-0000-0000-000000000001".equals(value)) {
                        return Health.up().withDetail("tenantSessionVar", value).build();
                    }
                }
            }
            return Health.down().withDetail("reason", "tenant session var not applied").build();
        } catch (Exception ex) {
            return Health.down(ex).build();
        }
    }

    private boolean isPostgres(Connection connection) {
        try {
            DatabaseMetaData metaData = connection.getMetaData();
            if (metaData == null) {
                return false;
            }
            String productName = metaData.getDatabaseProductName();
            return productName != null && productName.toLowerCase().contains("postgres");
        } catch (Exception ex) {
            return false;
        }
    }
}
