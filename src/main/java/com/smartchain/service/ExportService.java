package com.smartchain.service;

import com.smartchain.audit.AuditService;
import com.smartchain.dto.ExportRequest;
import com.smartchain.entity.ExportJob;
import com.smartchain.repository.ExportJobRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ExportService {
    private final ExportJobRepository repository;
    private final AuditService auditService;

    public ExportService(ExportJobRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @Transactional
    public UUID queue(ExportRequest request) {
        UUID tenantId = requireTenant();
        ExportJob job = new ExportJob();
        job.setId(UUID.randomUUID());
        job.setTenantId(tenantId);
        job.setRole(request.role());
        job.setFormat(request.format().toUpperCase());
        job.setStatus("QUEUED");
        job.setCreatedAt(Instant.now());
        repository.save(job);
        auditService.logAction("EXPORT", "DASHBOARD_EXPORT", "{}", "{\"id\":\"" + job.getId() + "\"}");
        return job.getId();
    }

    @Scheduled(fixedDelayString = "${smartchain.export.poll-delay-ms:30000}")
    @Transactional
    public void processQueued() {
        repository.findAll().stream()
            .filter(job -> "QUEUED".equals(job.getStatus()))
            .limit(20)
            .forEach(job -> {
                job.setStatus("COMPLETED");
                job.setDownloadUrl("/downloads/" + job.getId() + "." + job.getFormat().toLowerCase());
                job.setCompletedAt(Instant.now());
            });
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, Object> status(UUID id) {
        UUID tenantId = requireTenant();
        ExportJob job = repository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Export job not found"));
        return java.util.Map.of(
            "id", job.getId(),
            "role", job.getRole(),
            "format", job.getFormat(),
            "status", job.getStatus(),
            "downloadUrl", job.getDownloadUrl() == null ? "" : job.getDownloadUrl(),
            "createdAt", String.valueOf(job.getCreatedAt()),
            "completedAt", String.valueOf(job.getCompletedAt())
        );
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
