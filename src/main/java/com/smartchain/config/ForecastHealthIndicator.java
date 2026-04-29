package com.smartchain.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class ForecastHealthIndicator implements HealthIndicator {
    private final WebClient webClient;

    public ForecastHealthIndicator(@Value("${smartchain.forecast.base-url:http://localhost:8090}") String baseUrl) {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
    }

    @Override
    public Health health() {
        try {
            webClient.get().uri("/health").retrieve().bodyToMono(String.class).block();
            return Health.up().build();
        } catch (Exception ex) {
            return Health.down(ex).build();
        }
    }
}
