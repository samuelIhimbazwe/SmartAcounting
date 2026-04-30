package com.smartchain.service;

import com.smartchain.alerts.AlertFanoutService;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.CreateAnomalyCaseRequest;
import com.smartchain.entity.AnomalyCase;
import com.smartchain.repository.AnomalyCaseRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AnomalyCaseService {
    private final AnomalyCaseRepository repository;
    private final AlertFanoutService fanoutService;
    private final AuditService auditService;

    public AnomalyCaseService(AnomalyCaseRepository repository, AlertFanoutService fanoutService, AuditService auditService) {
        this.repository = repository;
        this.fanoutService = fanoutService;
        this.auditService = auditService;
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

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
