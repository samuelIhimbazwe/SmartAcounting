package com.smartchain.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.entity.OutboxEvent;
import com.smartchain.repository.OutboxEventRepository;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@Primary
public class OutboxDomainEventPublisher implements DomainEventPublisher {
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public OutboxDomainEventPublisher(OutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publish(String topic, String eventType, Map<String, Object> payload) {
        OutboxEvent event = new OutboxEvent();
        event.setId(UUID.randomUUID());
        if (payload != null && payload.get("tenantId") != null) {
            try {
                event.setTenantId(UUID.fromString(String.valueOf(payload.get("tenantId"))));
            } catch (Exception ignored) {
                // Outbox remains valid if tenant id cannot be parsed.
            }
        }
        event.setTopic(topic);
        event.setEventType(eventType);
        try {
            event.setPayload(objectMapper.writeValueAsString(payload == null ? Map.of() : payload));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid outbox payload", e);
        }
        event.setStatus("PENDING");
        event.setAttemptCount(0);
        event.setCreatedAt(Instant.now());
        outboxEventRepository.save(event);
    }
}
