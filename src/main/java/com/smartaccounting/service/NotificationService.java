package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.alerts.AlertFanoutService;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.NotificationEventRequest;
import com.smartaccounting.dto.NotificationRuleRequest;
import com.smartaccounting.entity.NotificationEvent;
import com.smartaccounting.entity.NotificationRule;
import com.smartaccounting.entity.NotificationSmsDeliveryLog;
import com.smartaccounting.repository.NotificationEventRepository;
import com.smartaccounting.repository.NotificationRuleRepository;
import com.smartaccounting.repository.NotificationSmsDeliveryLogRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class NotificationService {
    private final NotificationRuleRepository ruleRepository;
    private final NotificationEventRepository eventRepository;
    private final ObjectMapper objectMapper;
    private final AlertFanoutService fanoutService;
    private final SmsDispatchService smsDispatchService;
    private final NotificationSmsDeliveryLogRepository smsDeliveryLogRepository;
    private final AuditService auditService;

    public NotificationService(NotificationRuleRepository ruleRepository,
                               NotificationEventRepository eventRepository,
                               ObjectMapper objectMapper,
                               AlertFanoutService fanoutService,
                               SmsDispatchService smsDispatchService,
                               NotificationSmsDeliveryLogRepository smsDeliveryLogRepository,
                               AuditService auditService) {
        this.ruleRepository = ruleRepository;
        this.eventRepository = eventRepository;
        this.objectMapper = objectMapper;
        this.fanoutService = fanoutService;
        this.smsDispatchService = smsDispatchService;
        this.smsDeliveryLogRepository = smsDeliveryLogRepository;
        this.auditService = auditService;
    }

    @Transactional
    public UUID createRule(NotificationRuleRequest req) {
        UUID tenant = requireTenant();
        NotificationRule r = new NotificationRule();
        r.setId(UUID.randomUUID());
        r.setTenantId(tenant);
        r.setEventType(req.eventType().trim().toUpperCase(Locale.ROOT));
        try {
            r.setChannelsJson(objectMapper.writeValueAsString(req.channels()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid channels payload");
        }
        r.setTargetRole(req.targetRole() == null ? null : req.targetRole().toLowerCase());
        r.setActive(true);
        r.setCreatedAt(Instant.now());
        ruleRepository.save(r);
        auditService.logAction("NOTIFICATION_RULE_CREATED", "NOTIFICATION_RULE", "{}", "{\"id\":\"" + r.getId() + "\"}");
        return r.getId();
    }

    @Transactional
    public UUID emit(NotificationEventRequest req) {
        UUID tenant = requireTenant();
        String eventType = req.eventType().trim().toUpperCase(Locale.ROOT);
        NotificationEvent e = new NotificationEvent();
        e.setId(UUID.randomUUID());
        e.setTenantId(tenant);
        e.setEventType(eventType);
        try {
            e.setPayload(objectMapper.writeValueAsString(req.payload()));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid notification payload");
        }
        List<NotificationRule> rules = ruleRepository.findByTenantIdAndEventTypeAndActiveTrue(tenant, eventType);
        int smsSent = 0;
        List<String> requestedChannels = req.channels() == null ? List.of() : req.channels();
        String directTargetRole = req.targetRole() == null ? "" : req.targetRole().trim().toLowerCase(Locale.ROOT);
        if (!directTargetRole.isBlank() && requestedChannels.stream().anyMatch(ch -> "in-app".equalsIgnoreCase(ch))) {
            fanoutService.fanoutRoleAlert(directTargetRole, eventType, "HIGH");
        }
        if (requestedChannels.stream().anyMatch(ch -> "sms".equalsIgnoreCase(ch))) {
            smsSent += smsDispatchService.send(
                tenant,
                e.getId(),
                eventType,
                resolveRecipients(req.payload()),
                resolveMessage(eventType, req.payload())
            );
        }
        for (NotificationRule rule : rules) {
            List<String> channels = decodeChannels(rule.getChannelsJson());
            if (rule.getTargetRole() != null && !rule.getTargetRole().isBlank()) {
                fanoutService.fanoutRoleAlert(rule.getTargetRole(), eventType, "MEDIUM");
            }
            if (channels.stream().anyMatch(ch -> "SMS".equalsIgnoreCase(ch))) {
                smsSent += smsDispatchService.send(
                    tenant,
                    e.getId(),
                    eventType,
                    resolveRecipients(req.payload()),
                    resolveMessage(eventType, req.payload())
                );
            }
        }
        e.setStatus(smsSent > 0 ? "DISPATCHED_SMS" : "DISPATCHED");
        e.setCreatedAt(Instant.now());
        eventRepository.save(e);
        auditService.logAction("NOTIFICATION_EVENT_EMITTED", "NOTIFICATION_EVENT", "{}", "{\"id\":\"" + e.getId() + "\"}");
        return e.getId();
    }

    @Transactional(readOnly = true)
    public List<NotificationRule> activeRules() {
        UUID tenant = requireTenant();
        return ruleRepository.findTop100ByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenant);
    }

    @Transactional(readOnly = true)
    public List<NotificationRule> activeRules(int page, int size) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        return ruleRepository.findByTenantIdAndActiveTrueOrderByCreatedAtDesc(tenant, PageRequest.of(safePage, safeSize));
    }

    @Transactional(readOnly = true)
    public List<NotificationEvent> recentEvents() {
        UUID tenant = requireTenant();
        return eventRepository.findTop100ByTenantIdOrderByCreatedAtDesc(tenant);
    }

    @Transactional(readOnly = true)
    public List<NotificationEvent> recentEvents(int page, int size) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        return eventRepository.findByTenantIdOrderByCreatedAtDesc(tenant, PageRequest.of(safePage, safeSize));
    }

    @Transactional(readOnly = true)
    public List<NotificationSmsDeliveryLog> recentSmsDeliveries(UUID eventId, int page, int size) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        if (eventId != null) {
            return smsDeliveryLogRepository.findByTenantIdAndNotificationEventIdOrderByCreatedAtDesc(
                tenant, eventId, PageRequest.of(safePage, safeSize));
        }
        return smsDeliveryLogRepository.findByTenantIdOrderByCreatedAtDesc(tenant, PageRequest.of(safePage, safeSize));
    }

    @Transactional(readOnly = true)
    public String smsDeliveriesCsv(UUID eventId, String status, String phone, int limit) {
        UUID tenant = requireTenant();
        int safeLimit = Math.min(5000, Math.max(1, limit));
        List<NotificationSmsDeliveryLog> base = eventId != null
            ? smsDeliveryLogRepository.findByTenantIdAndNotificationEventIdOrderByCreatedAtDesc(tenant, eventId, PageRequest.of(0, safeLimit))
            : smsDeliveryLogRepository.findByTenantIdOrderByCreatedAtDesc(tenant, PageRequest.of(0, safeLimit));

        String statusFilter = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        String phoneFilter = phone == null ? "" : phone.trim().toLowerCase(Locale.ROOT);

        StringBuilder csv = new StringBuilder();
        csv.append("createdAt,eventType,notificationEventId,recipientPhone,status,responseCode,errorMessage\n");
        Stream<NotificationSmsDeliveryLog> filtered = base.stream()
            .filter(r -> statusFilter.isEmpty() || statusFilter.equals(r.getStatus() == null ? "" : r.getStatus().toUpperCase(Locale.ROOT)))
            .filter(r -> phoneFilter.isEmpty() || (r.getRecipientPhone() != null && r.getRecipientPhone().toLowerCase(Locale.ROOT).contains(phoneFilter)));
        filtered.forEach(r -> csv
            .append(csvCell(r.getCreatedAt()))
            .append(',').append(csvCell(r.getEventType()))
            .append(',').append(csvCell(r.getNotificationEventId()))
            .append(',').append(csvCell(r.getRecipientPhone()))
            .append(',').append(csvCell(r.getStatus()))
            .append(',').append(csvCell(r.getResponseCode()))
            .append(',').append(csvCell(r.getErrorMessage()))
            .append('\n'));
        return csv.toString();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }

    @SuppressWarnings("unchecked")
    private List<String> decodeChannels(String channelsJson) {
        if (channelsJson == null || channelsJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(channelsJson, List.class);
        } catch (Exception ex) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> resolveRecipients(java.util.Map<String, Object> payload) {
        List<String> out = new ArrayList<>();
        Object one = payload.get("phoneNumber");
        if (one instanceof String s && !s.isBlank()) {
            out.add(s.trim());
        }
        Object many = payload.get("phoneNumbers");
        if (many instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof String s && !s.isBlank()) {
                    out.add(s.trim());
                }
            }
        }
        return out.stream().distinct().toList();
    }

    private String resolveMessage(String eventType, java.util.Map<String, Object> payload) {
        Object explicit = payload.get("message");
        if (explicit instanceof String s && !s.isBlank()) {
            return s.trim();
        }
        return "SMARTCHAIN alert: " + eventType + " " + payload;
    }

    private String csvCell(Object value) {
        if (value == null) {
            return "\"\"";
        }
        String s = value.toString().replace("\"", "\"\"");
        return "\"" + s + "\"";
    }
}
