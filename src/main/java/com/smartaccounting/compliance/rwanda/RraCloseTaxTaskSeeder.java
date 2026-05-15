package com.smartaccounting.compliance.rwanda;

import com.smartaccounting.dto.CreateCloseTaskRequest;
import com.smartaccounting.repository.CloseTaskRepository;
import com.smartaccounting.service.CloseWorkflowService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds standard Rwanda tax / compliance tasks into the existing {@link com.smartaccounting.entity.CloseTask} workflow.
 */
@Service
public class RraCloseTaxTaskSeeder {
    private final CloseWorkflowService closeWorkflowService;
    private final CloseTaskRepository closeTaskRepository;

    private record TaskSpec(String key, String ownerRole, List<String> dependsOn, BigDecimal risk) {}

    private static final List<TaskSpec> SPECS = List.of(
        new TaskSpec("rra.vat.prepare", "accounting", List.of(), new BigDecimal("0.65")),
        new TaskSpec("rra.vat.cfo-review", "cfo", List.of("rra.vat.prepare"), new BigDecimal("0.72")),
        new TaskSpec("rra.vat.rra-submit", "accounting", List.of("rra.vat.cfo-review"), new BigDecimal("0.78")),
        new TaskSpec("rra.paye.review", "accounting", List.of(), new BigDecimal("0.55")),
        new TaskSpec("rra.wht.review", "accounting", List.of(), new BigDecimal("0.55")),
        new TaskSpec("rra.cit.review", "cfo", List.of(), new BigDecimal("0.48"))
    );

    public RraCloseTaxTaskSeeder(CloseWorkflowService closeWorkflowService, CloseTaskRepository closeTaskRepository) {
        this.closeWorkflowService = closeWorkflowService;
        this.closeTaskRepository = closeTaskRepository;
    }

    public Map<String, Object> seedTaxTasks(String period) {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        int created = 0;
        int skipped = 0;
        for (TaskSpec spec : SPECS) {
            if (closeTaskRepository.findByTenantIdAndPeriodAndTaskKey(TenantContext.tenantId(), period, spec.key).isPresent()) {
                skipped++;
                continue;
            }
            closeWorkflowService.createTask(new CreateCloseTaskRequest(
                period,
                spec.key,
                spec.ownerRole,
                spec.dependsOn,
                spec.risk
            ));
            created++;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("period", period);
        out.put("created", created);
        out.put("skippedExisting", skipped);
        return out;
    }
}
