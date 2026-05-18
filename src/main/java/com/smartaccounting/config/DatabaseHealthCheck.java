package com.smartaccounting.config;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Component("databasePool")
public class DatabaseHealthCheck implements HealthIndicator {

    private final DataSource dataSource;

    public DatabaseHealthCheck(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("SELECT 1");
            Health.Builder builder = Health.up().withDetail("query", "SELECT 1 OK");
            if (dataSource instanceof HikariDataSource hikari) {
                HikariPoolMXBean pool = hikari.getHikariPoolMXBean();
                if (pool != null) {
                    builder.withDetail("active", pool.getActiveConnections())
                        .withDetail("idle", pool.getIdleConnections())
                        .withDetail("pending", pool.getThreadsAwaitingConnection());
                }
            }
            return builder.build();
        } catch (Exception ex) {
            return Health.down(ex).build();
        }
    }
}
