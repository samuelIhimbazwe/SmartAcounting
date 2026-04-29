package com.smartchain.events;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.dashboard.DashboardCacheService;
import com.smartchain.dashboard.IncrementalProjectionService;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.slf4j.MDC;

import java.util.Map;
import java.util.UUID;

@Component
@ConditionalOnProperty(prefix = "smartchain.kafka", name = "enabled", havingValue = "true")
public class DomainEventConsumer {
    private final IncrementalProjectionService projectionService;
    private final DashboardCacheService cacheService;
    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String dlqTopic;

    public DomainEventConsumer(IncrementalProjectionService projectionService,
                               DashboardCacheService cacheService,
                               ObjectMapper objectMapper,
                               KafkaTemplate<String, String> kafkaTemplate,
                               @Value("${smartchain.kafka.topic-dlq-events:domain.events.dlq}") String dlqTopic) {
        this.projectionService = projectionService;
        this.cacheService = cacheService;
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.dlqTopic = dlqTopic;
    }

    @KafkaListener(topics = "${smartchain.kafka.topic-domain-events:domain.events}")
    public void onEvent(ConsumerRecord<String, String> record) {
        String message = record.value();
        String corr = header(record, "X-Correlation-Id");
        if (corr != null && !corr.isBlank()) {
            MDC.put("correlationId", corr);
        }
        try {
            JsonNode root = objectMapper.readTree(message);
            JsonNode payload = root.path("payload");
            String tenantId = payload.path("tenantId").asText(null);
            if (tenantId != null && !tenantId.isBlank()) {
                UUID tid = UUID.fromString(tenantId);
                projectionService.refreshTenant(tid);
                cacheService.invalidateAllRoles(tid);
            }
        } catch (Exception ex) {
            try {
                String dlq = objectMapper.writeValueAsString(Map.of(
                    "consumer", "DomainEventConsumer",
                    "reason", ex.getMessage(),
                    "message", message
                ));
                kafkaTemplate.send(dlqTopic, "CONSUMER_FAILURE", dlq);
            } catch (Exception ignored) {
                // Ignore nested failures to avoid consumer loop.
            }
        } finally {
            MDC.remove("correlationId");
        }
    }

    private String header(ConsumerRecord<String, String> record, String key) {
        var header = record.headers().lastHeader(key);
        if (header == null) return null;
        return new String(header.value(), java.nio.charset.StandardCharsets.UTF_8);
    }
}
