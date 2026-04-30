package com.smartchain.alerts;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@ConditionalOnProperty(prefix = "smartchain.kafka", name = "enabled", havingValue = "true")
public class AlertKafkaConsumers {
    private final SseEventBroadcaster broadcaster;
    private final ObjectMapper objectMapper;

    public AlertKafkaConsumers(SseEventBroadcaster broadcaster, ObjectMapper objectMapper) {
        this.broadcaster = broadcaster;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "domain.alerts")
    public void domainAlerts(String message) {
        route("domain.alert", message);
    }

    @KafkaListener(topics = "domain.workflow.alerts")
    public void workflowAlerts(String message) {
        route("workflow.alert", message);
    }

    @KafkaListener(topics = "domain.action.queue")
    public void actionAlerts(String message) {
        route("action.alert", message);
    }

    private void route(String eventName, String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            JsonNode payload = root.path("payload");
            UUID tenant = UUID.fromString(payload.path("tenantId").asText());
            String role = payload.path("role").asText("ceo");
            broadcaster.broadcastToRole(tenant, role, eventName, message);
        } catch (Exception ignored) {
        }
    }
}
