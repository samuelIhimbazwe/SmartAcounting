package com.smartchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.alerts.AlertFanoutService;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.NotificationEventRequest;
import com.smartchain.dto.NotificationRuleRequest;
import com.smartchain.entity.NotificationEvent;
import com.smartchain.entity.NotificationRule;
import com.smartchain.repository.NotificationEventRepository;
import com.smartchain.repository.NotificationRuleRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {
    private final NotificationRuleRepository ruleRepository;
    private final NotificationEventRepository eventRepository;
    private final ObjectMapper objectMapper;
    private final AlertFanoutService fanoutService;
    private final AuditService auditService;

    public NotificationService(NotificationRuleRepository ruleRepository,
                               NotificationEventRepository eventRepository,
                               ObjectMapper objectMapper,
                               AlertFanoutService fanoutService,
                               AuditService auditService) {
        this.ruleRepository = ruleRepository;
        this.eventRepository = eventRepository;
        this.objectMapper = objectMapper;
        this.fanoutService = fanoutService;
        this.auditService = auditService;
    }

    @Transactional
    public UUID createRule(NotificationRuleRequest req) {
        requireTenant();
        NotificationRule r = new NotificationRule();
        r.setId(UUID.randomUUID());
        r.setTenantId(TenantContext.tenantId());
        r.setEventType(req.eventType());
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
        requireTenant();
        NotificationEvent e = new NotificationEvent();
        e.setId(UUID.randomUUID());
        e.setTenantId(TenantContext.tenantId());
        e.setEventType(req.eventType());
        try {
            e.setPayload(objectMapper.writeValueAsString(req.payload()));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid notification payload");
        }
        List<NotificationRule> rules = ruleRepository.findByEventTypeAndActiveTrue(req.eventType());
        for (NotificationRule rule : rules) {
            if (rule.getTargetRole() != null && !rule.getTargetRole().isBlank()) {
                fanoutService.fanoutRoleAlert(rule.getTargetRole(), req.eventType(), "MEDIUM");
            }
        }
        e.setStatus("DISPATCHED");
        e.setCreatedAt(Instant.now());
        eventRepository.save(e);
        auditService.logAction("NOTIFICATION_EVENT_EMITTED", "NOTIFICATION_EVENT", "{}", "{\"id\":\"" + e.getId() + "\"}");
        return e.getId();
    }

    @Transactional(readOnly = true)
    public List<NotificationRule> activeRules() {
        requireTenant();
        return ruleRepository.findTop100ByActiveTrueOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<NotificationRule> activeRules(int page, int size) {
        requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        return ruleRepository.findByActiveTrueOrderByCreatedAtDesc(PageRequest.of(safePage, safeSize));
    }

    @Transactional(readOnly = true)
    public List<NotificationEvent> recentEvents() {
        requireTenant();
        return eventRepository.findTop100ByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<NotificationEvent> recentEvents(int page, int size) {
        requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        return eventRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(safePage, safeSize));
    }

    private void requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
    }
}
