package com.smartaccounting.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.DomainEventRequest;
import com.smartaccounting.entity.EventLog;
import com.smartaccounting.events.DomainEventPublisher;
import com.smartaccounting.repository.EventLogRepository;
import com.smartaccounting.service.WebhookDispatchService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class EventLogService {
    private final EventLogRepository eventLogRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final DomainEventPublisher eventPublisher;
    private final WebhookDispatchService webhookDispatchService;
    private final String domainEventsTopic;

    public EventLogService(EventLogRepository eventLogRepository,
                           AuditService auditService,
                           ObjectMapper objectMapper,
                           DomainEventPublisher eventPublisher,
                           WebhookDispatchService webhookDispatchService,
                           @Value("${smartaccounting.kafka.topic-domain-events:domain.events}") String domainEventsTopic) {
        this.eventLogRepository = eventLogRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
        this.webhookDispatchService = webhookDispatchService;
        this.domainEventsTopic = domainEventsTopic;
    }

    @Transactional
    public UUID append(DomainEventRequest request) {
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context is required");
        }

        EventLog event = new EventLog();
        event.setId(UUID.randomUUID());
        event.setTenantId(tenantId);
        event.setAggregateType(request.aggregateType());
        event.setAggregateId(request.aggregateId());
        event.setEventType(request.eventType());
        event.setPayload(toJson(request.payload()));
        event.setCreatedAt(Instant.now());
        eventLogRepository.save(event);
        Map<String, Object> publishPayload = new HashMap<>(request.payload());
        publishPayload.put("tenantId", tenantId.toString());
        publishPayload.put("aggregateType", request.aggregateType());
        publishPayload.put("aggregateId", request.aggregateId().toString());
        publishPayload.put("eventType", request.eventType());
        publishPayload.put("createdAt", event.getCreatedAt().toString());
        eventPublisher.publish(domainEventsTopic, request.eventType(), publishPayload);
        webhookDispatchService.dispatch(request.eventType(), publishPayload);

        auditService.logAction("EVENT_APPEND", "EVENT_LOG", "{}", event.getPayload());
        return event.getId();
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid event payload", e);
        }
    }
}
