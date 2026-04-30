package com.smartchain.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
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
}
