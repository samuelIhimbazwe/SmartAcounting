package com.smartchain.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.slf4j.MDC;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@ConditionalOnProperty(prefix = "smartchain.kafka", name = "enabled", havingValue = "true")
public class KafkaDomainEventPublisher implements DomainEventPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String dlqTopic;

    public KafkaDomainEventPublisher(KafkaTemplate<String, String> kafkaTemplate,
                                     ObjectMapper objectMapper,
                                     @Value("${smartchain.kafka.topic-dlq-events:domain.events.dlq}") String dlqTopic) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.dlqTopic = dlqTopic;
    }

    @Override
    public void publish(String topic, String eventType, Map<String, Object> payload) {
        try {
            String json = objectMapper.writeValueAsString(Map.of(
                "eventType", eventType,
                "payload", payload
            ));
            String tenantKey = payload != null && payload.get("tenantId") != null
                ? String.valueOf(payload.get("tenantId"))
                : eventType;
            ProducerRecord<String, String> record = new ProducerRecord<>(topic, tenantKey, json);
            String correlationId = MDC.get("correlationId");
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString();
            }
            record.headers().add("X-Correlation-Id", correlationId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            if (payload != null && payload.get("tenantId") != null) {
                record.headers().add("X-Tenant-Id", String.valueOf(payload.get("tenantId")).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            kafkaTemplate.send(record);
        } catch (Exception e) {
            try {
                Map<String, Object> dlqPayload = new HashMap<>();
                dlqPayload.put("originalTopic", topic);
                dlqPayload.put("eventType", eventType);
                dlqPayload.put("reason", e.getMessage());
                dlqPayload.put("payload", payload);
                kafkaTemplate.send(dlqTopic, eventType, objectMapper.writeValueAsString(dlqPayload));
            } catch (Exception ignored) {
                // Last resort: bubble up original failure.
            }
            throw new IllegalStateException("Kafka publish failed", e);
        }
    }
}
