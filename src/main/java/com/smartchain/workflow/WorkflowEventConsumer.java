package com.smartchain.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@ConditionalOnProperty(prefix = "smartchain.kafka", name = "enabled", havingValue = "true")
public class WorkflowEventConsumer {
    private final WorkflowRuleEngine workflowRuleEngine;
    private final ObjectMapper objectMapper;

    public WorkflowEventConsumer(WorkflowRuleEngine workflowRuleEngine, ObjectMapper objectMapper) {
        this.workflowRuleEngine = workflowRuleEngine;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "domain.entity.events")
    public void consume(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            String eventType = root.path("eventType").asText();
            JsonNode payloadNode = root.path("payload");
            UUID tenantId = UUID.fromString(payloadNode.path("tenantId").asText());
            Map<String, Object> payload = objectMapper.convertValue(payloadNode, Map.class);
            workflowRuleEngine.evaluate(tenantId, eventType, payload, false);
        } catch (Exception ignored) {
        }
    }
}
