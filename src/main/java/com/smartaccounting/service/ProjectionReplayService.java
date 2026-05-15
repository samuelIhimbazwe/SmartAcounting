package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dashboard.CeoSnapshotProjector;
import com.smartaccounting.dashboard.FinancialSnapshotProjector;
import com.smartaccounting.dashboard.HrMarketingAccountingProjector;
import com.smartaccounting.dashboard.SalesOpsSnapshotProjector;
import com.smartaccounting.entity.ProjectionRebuildJob;
import com.smartaccounting.repository.ProjectionRebuildJobRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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

    public UUID rebuildAll(Instant from, Instant to) {
        ProjectionRebuildJob job = new ProjectionRebuildJob();
        job.setId(UUID.randomUUID());
        job.setTenantId(TenantContext.tenantId());
        job.setStartedAt(Instant.now());
        job.setStatus("RUNNING");
        job.setFromTs(from);
        job.setToTs(to);
        repository.save(job);
        List<Map<String, String>> failures = new ArrayList<>();
        runProjector("ceo", ceoSnapshotProjector::project, failures);
        runProjector("cfo", financialSnapshotProjector::projectCfo, failures);
        runProjector("sales-ops", salesOpsSnapshotProjector::project, failures);
        runProjector("hr-marketing-accounting", hrMarketingAccountingProjector::project, failures);
        job.setStatus(failures.isEmpty() ? "COMPLETED" : "COMPLETED_WITH_ERRORS");
        job.setCompletedAt(Instant.now());
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("projectors", 4);
        details.put("mode", "full-recompute");
        details.put("from", from == null ? "all" : from.toString());
        details.put("to", to == null ? "now" : to.toString());
        details.put("failureCount", failures.size());
        if (!failures.isEmpty()) {
            details.put("failedProjectors", failures.stream().map(m -> m.get("projector")).toList());
        }
        job.setDetailsJson(toJson(details));
        repository.save(job);
        return job.getId();
    }

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

    private void runProjector(String name, Runnable action, List<Map<String, String>> failures) {
        try {
            action.run();
        } catch (Exception ex) {
            failures.add(Map.of(
                "projector", name,
                "error", ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage()
            ));
        }
    }
}
