package com.smartchain.forecast;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;
import java.util.UUID;

@Component
public class ForecastClient {
    private final WebClient webClient;
    private final int timeoutSeconds;

    public ForecastClient(@Value("${smartchain.forecast.base-url:http://localhost:8090}") String baseUrl,
                          @Value("${smartchain.forecast.timeout-seconds:8}") int timeoutSeconds) {
        this.webClient = WebClient.builder().baseUrl(baseUrl).build();
        this.timeoutSeconds = timeoutSeconds;
    }

    public Map<String, Object> forecast(UUID tenantId, String metric, int historyDays, int forecastDays) {
        return webClient.post()
            .uri("/forecast")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of(
                "tenant_id", tenantId.toString(),
                "metric", metric,
                "history_days", historyDays,
                "forecast_days", forecastDays
            ))
            .retrieve()
            .bodyToMono(Map.class)
            .block(java.time.Duration.ofSeconds(timeoutSeconds));
    }
}
