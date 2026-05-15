package com.smartaccounting.compliance.rwanda;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Low-level HTTP bridge to RRA EIS / filing endpoints. Replace base URL and paths with values from your
 * production certification package when moving beyond sandbox.
 */
@Service
public class RraHttpGateway {
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public RraHttpGateway(WebClient rraWebClient, ObjectMapper objectMapper) {
        this.webClient = rraWebClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> postJson(RwandaComplianceProperties props, String relativePath, String jsonBody) {
        if (!props.isEnabled()) {
            return Map.of(
                "stub", true,
                "reference", "RRA-STUB-" + UUID.randomUUID(),
                "message", "smartaccounting.rra.rwanda.enabled=false; no HTTP call executed."
            );
        }
        String envName = props.getApiTokenEnvironmentVariable();
        String token = envName != null ? System.getenv(envName) : null;
        if (token == null || token.isBlank()) {
            return Map.of(
                "ok", false,
                "error", "Missing environment variable " + envName + " for RRA API token"
            );
        }
        String base = props.getBaseUrl().endsWith("/")
            ? props.getBaseUrl().substring(0, props.getBaseUrl().length() - 1)
            : props.getBaseUrl();
        String path = relativePath.startsWith("/") ? relativePath : "/" + relativePath;
        Duration timeout = Duration.ofMillis(props.getReadTimeoutMs());
        try {
            String raw = webClient.post()
                .uri(base + path)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(jsonBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(timeout)
                .block(timeout.plusSeconds(1));
            if (raw == null || raw.isBlank()) {
                return Map.of("ok", true, "raw", "");
            }
            return objectMapper.readValue(raw, objectMapper.getTypeFactory().constructMapType(LinkedHashMap.class, String.class, Object.class));
        } catch (WebClientResponseException ex) {
            return Map.of(
                "ok", false,
                "httpStatus", ex.getStatusCode().value(),
                "error", ex.getResponseBodyAsString()
            );
        } catch (Exception ex) {
            return Map.of("ok", false, "error", ex.getMessage());
        }
    }
}
