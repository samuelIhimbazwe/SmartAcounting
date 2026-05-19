package com.smartaccounting.service;

import com.smartaccounting.alerts.AlertFanoutService;
import com.smartaccounting.audit.AuditService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dto.CreateAnomalyCaseRequest;
import com.smartaccounting.entity.AnomalyCase;
import com.smartaccounting.repository.AnomalyCaseRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AnomalyCaseService {
    private final AnomalyCaseRepository repository;
    private final AlertFanoutService fanoutService;
    private final AuditService auditService;
    private final ActionQueueService actionQueueService;
    private final ObjectMapper objectMapper;

    public AnomalyCaseService(AnomalyCaseRepository repository,
                              AlertFanoutService fanoutService,
                              AuditService auditService,
                              ActionQueueService actionQueueService,
                              ObjectMapper objectMapper) {
        this.repository = repository;
        this.fanoutService = fanoutService;
        this.auditService = auditService;
        this.actionQueueService = actionQueueService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UUID create(CreateAnomalyCaseRequest request) {
        UUID tenant = requireTenant();
        AnomalyCase c = new AnomalyCase();
        c.setId(UUID.randomUUID());
        c.setTenantId(tenant);
        c.setAffectedRole(request.affectedRole().toLowerCase());
        c.setSeverity(request.severity().toUpperCase());
        c.setTitle(request.title());
        c.setDetails(request.details());
        c.setStatus("OPEN");
        c.setCreatedAt(Instant.now());
        repository.save(c);
        fanoutService.fanoutRoleAlert(c.getAffectedRole(), c.getTitle(), c.getSeverity());
        auditService.logAction("ANOMALY_CASE_CREATED", "ANOMALY", "{}", "{\"id\":\"" + c.getId() + "\"}");
        return c.getId();
    }

    @Transactional(readOnly = true)
    public List<AnomalyCase> listOpen(String role) {
        return repository.findTop20ByAffectedRoleAndStatusOrderByCreatedAtDesc(role.toLowerCase(), "OPEN");
    }

    @Transactional(readOnly = true)
    public List<AnomalyCase> listOpen(String role, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        return repository.findByAffectedRoleAndStatusOrderByCreatedAtDesc(role.toLowerCase(), "OPEN", PageRequest.of(safePage, safeSize));
    }

    /**
     * Count of OPEN anomaly cases for the tenant (all roles).
     */
    @Transactional(readOnly = true)
    public long getOpenCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        return repository.countByTenantIdAndStatus(tenantId, "OPEN");
    }

    @Transactional
    public Map<String, Object> markReviewed(UUID caseId) {
        AnomalyCase c = requireOwned(caseId);
        c.setStatus("REVIEWED");
        repository.save(c);
        auditService.logAction("ANOMALY_REVIEWED", "ANOMALY", "{}", "{\"id\":\"" + caseId + "\"}");
        return Map.of("anomalyCaseId", caseId, "status", "REVIEWED");
    }

    @Transactional
    public Map<String, Object> escalate(UUID caseId, String note) {
        AnomalyCase c = requireOwned(caseId);
        c.setStatus("ESCALATED");
        repository.save(c);
        String payload = toJson(Map.of(
            "anomalyCaseId", caseId.toString(),
            "title", c.getTitle(),
            "severity", c.getSeverity(),
            "note", note == null ? "" : note
        ));
        UUID actionId = actionQueueService.enqueue("ANOMALY_ESCALATION", caseId.toString(), payload);
        auditService.logAction("ANOMALY_ESCALATED", "ANOMALY", "{}", payload);
        return Map.of("anomalyCaseId", caseId, "status", "ESCALATED", "actionId", actionId);
    }

    /**
     * Resolves a persisted case id from an SSE/mobile alert payload, creating a case when needed.
     */
    @Transactional
    public UUID resolveCaseFromAlert(Map<String, Object> alert) {
        UUID tenant = requireTenant();
        Object idObj = alert.get("anomalyId");
        if (idObj == null) {
            idObj = alert.get("anomalyCaseId");
        }
        if (idObj != null && !String.valueOf(idObj).isBlank()) {
            try {
                UUID parsed = UUID.fromString(String.valueOf(idObj));
                if (repository.findByIdAndTenantId(parsed, tenant).isPresent()) {
                    return parsed;
                }
            } catch (IllegalArgumentException ignored) {
                /* fall through to create from alert payload */
            }
        }
        String type = String.valueOf(
            alert.getOrDefault("anomalyType", alert.getOrDefault("type", "ANOMALY"))
        );
        String message = String.valueOf(
            alert.getOrDefault("message", alert.getOrDefault("summary", type))
        );
        String role = String.valueOf(alert.getOrDefault("affectedRole", "ceo"));
        CreateAnomalyCaseRequest req = new CreateAnomalyCaseRequest(
            role,
            String.valueOf(alert.getOrDefault("severity", "MEDIUM")),
            type,
            message
        );
        return create(req);
    }

    @Transactional
    public Map<String, Object> reviewAlert(Map<String, Object> alert) {
        UUID caseId = resolveCaseFromAlert(alert);
        return markReviewed(caseId);
    }

    @Transactional
    public Map<String, Object> escalateAlert(Map<String, Object> alert, String note) {
        UUID caseId = resolveCaseFromAlert(alert);
        return escalate(caseId, note);
    }

    private AnomalyCase requireOwned(UUID caseId) {
        UUID tenant = requireTenant();
        return repository.findByIdAndTenantId(caseId, tenant)
            .orElseThrow(() -> new IllegalArgumentException("Anomaly case not found"));
    }

    private String toJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return new LinkedHashMap<>(map).toString();
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
