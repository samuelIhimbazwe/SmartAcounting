package com.smartchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.dashboard.CeoSnapshotProjector;
import com.smartchain.dashboard.FinancialSnapshotProjector;
import com.smartchain.dashboard.HrMarketingAccountingProjector;
import com.smartchain.dashboard.SalesOpsSnapshotProjector;
import com.smartchain.entity.ProjectionRebuildJob;
import com.smartchain.repository.ProjectionRebuildJobRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class ProjectionReplayService {
    private final ProjectionRebuildJobRepository repository;
    private final CeoSnapshotProjector ceoSnapshotProjector;
    private final FinancialSnapshotProjector financialSnapshotProjector;
    private final SalesOpsSnapshotProjector salesOpsSnapshotProjector;
    private final HrMarketingAccountingProjector hrMarketingAccountingProjector;
    private final ObjectMapper objectMapper;

    public ProjectionReplayService(ProjectionRebuildJobRepository repository,
                                   CeoSnapshotProjector ceoSnapshotProjector,
                                   FinancialSnapshotProjector financialSnapshotProjector,
                                   SalesOpsSnapshotProjector salesOpsSnapshotProjector,
                                   HrMarketingAccountingProjector hrMarketingAccountingProjector,
                                   ObjectMapper objectMapper) {
        this.repository = repository;
        this.ceoSnapshotProjector = ceoSnapshotProjector;
        this.financialSnapshotProjector = financialSnapshotProjector;
        this.salesOpsSnapshotProjector = salesOpsSnapshotProjector;
        this.hrMarketingAccountingProjector = hrMarketingAccountingProjector;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UUID rebuildAll(Instant from, Instant to) {
        ProjectionRebuildJob job = new ProjectionRebuildJob();
        job.setId(UUID.randomUUID());
        job.setTenantId(TenantContext.tenantId());
        job.setStartedAt(Instant.now());
        job.setStatus("RUNNING");
        job.setFromTs(from);
        job.setToTs(to);
        repository.save(job);
        try {
            ceoSnapshotProjector.project();
            financialSnapshotProjector.projectCfo();
            salesOpsSnapshotProjector.project();
            hrMarketingAccountingProjector.project();
            job.setStatus("COMPLETED");
            job.setCompletedAt(Instant.now());
            job.setDetailsJson(toJson(Map.of(
                "projectors", 4,
                "mode", "full-recompute",
                "from", from == null ? "all" : from.toString(),
                "to", to == null ? "now" : to.toString()
            )));
        } catch (Exception ex) {
            job.setStatus("FAILED");
            job.setCompletedAt(Instant.now());
            job.setDetailsJson(toJson(Map.of("error", ex.getMessage())));
            repository.save(job);
            throw ex;
        }
        repository.save(job);
        return job.getId();
    }

    @Transactional(readOnly = true)
    public ProjectionRebuildJob get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Projection rebuild job not found"));
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize projection job details", e);
        }
    }
}
