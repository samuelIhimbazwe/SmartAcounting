package com.smartchain.dashboard;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@ConditionalOnProperty(prefix = "smartchain.kafka", name = "enabled", havingValue = "true")
public class InventoryEventConsumer {
    private final IncrementalProjectionService projectionService;
    private final ObjectMapper objectMapper;

    public InventoryEventConsumer(IncrementalProjectionService projectionService, ObjectMapper objectMapper) {
        this.projectionService = projectionService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "domain.inventory.events")
    public void consume(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            JsonNode payload = root.path("payload");
            String tenantId = payload.path("tenantId").asText(null);
            if (tenantId != null && !tenantId.isBlank()) {
                projectionService.refreshTenant(UUID.fromString(tenantId));
            }
        } catch (Exception ignored) {
        }
    }
}
