package com.smartaccounting.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

@Component("redisPing")
public class RedisHealthCheck implements HealthIndicator {

    private final RedisConnectionFactory connectionFactory;

    public RedisHealthCheck(RedisConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    @Override
    public Health health() {
        try (RedisConnection connection = connectionFactory.getConnection()) {
            String pong = connection.ping();
            return Health.up().withDetail("ping", pong).build();
        } catch (Exception ex) {
            return Health.down(ex).build();
        }
    }
}
