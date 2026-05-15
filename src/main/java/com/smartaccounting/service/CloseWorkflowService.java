package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreateCloseTaskRequest;
import com.smartaccounting.entity.CloseTask;
import com.smartaccounting.repository.CloseTaskRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CloseWorkflowService {
    private final CloseTaskRepository repository;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public CloseWorkflowService(CloseTaskRepository repository, ObjectMapper objectMapper, AuditService auditService) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    @Transactional
    public UUID createTask(CreateCloseTaskRequest req) {
        CloseTask t = new CloseTask();
        t.setId(UUID.randomUUID());
        t.setTenantId(requireTenant());
        t.setPeriod(req.period());
        t.setTaskKey(req.taskKey());
        t.setOwnerRole(req.ownerRole().toLowerCase());
        t.setStatus("OPEN");
        try {
            t.setDependsOnJson(objectMapper.writeValueAsString(req.dependsOn()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid dependency payload");
        }
        t.setRiskScore(req.riskScore());
        t.setCreatedAt(Instant.now());
        repository.save(t);
        auditService.logAction("CLOSE_TASK_CREATED", "CLOSE_TASK", "{}", "{\"id\":\"" + t.getId() + "\"}");
        return t.getId();
    }

    @Transactional
    public void completeTask(String period, String taskKey) {
        UUID tenantId = requireTenant();
        CloseTask task = repository.findByTenantIdAndPeriodAndTaskKey(tenantId, period, taskKey)
            .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        List<String> deps = parseDeps(task.getDependsOnJson());
        for (String dep : deps) {
            CloseTask depTask = repository.findByTenantIdAndPeriodAndTaskKey(tenantId, period, dep)
                .orElseThrow(() -> new IllegalArgumentException("Dependency task missing: " + dep));
            if (!"DONE".equals(depTask.getStatus())) {
                throw new IllegalArgumentException("Dependency not completed: " + dep);
            }
        }
        task.setStatus("DONE");
        task.setCompletedAt(Instant.now());
        repository.save(task);
        auditService.logAction("CLOSE_TASK_COMPLETED", "CLOSE_TASK", "{}", "{\"taskKey\":\"" + taskKey + "\"}");
    }

    @Transactional(readOnly = true)
    public List<CloseTask> list(String period) {
        return repository.findByTenantIdAndPeriodOrderByCreatedAtAsc(requireTenant(), period);
    }

    @Transactional(readOnly = true)
    public long getOpenTaskCount(UUID tenantId) {
        if (tenantId == null) {
            return 0L;
        }
        return repository.countByTenantIdAndCompletedAtIsNull(tenantId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> criticalPathSummary(String period) {
        List<CloseTask> tasks = repository.findByTenantIdAndPeriodOrderByCreatedAtAsc(requireTenant(), period);
        Map<String, CloseTask> byKey = new HashMap<>();
        for (CloseTask t : tasks) byKey.put(t.getTaskKey(), t);

        Map<String, Integer> memo = new HashMap<>();
        java.util.concurrent.atomic.AtomicBoolean cycleDetected = new java.util.concurrent.atomic.AtomicBoolean(false);
        int longest = 0;
        for (CloseTask t : tasks) {
            longest = Math.max(longest, longestPathLen(t.getTaskKey(), byKey, memo, new java.util.HashSet<>(), cycleDetected));
        }
        long done = tasks.stream().filter(t -> "DONE".equals(t.getStatus())).count();
        long open = tasks.size() - done;
        return Map.of(
            "period", period,
            "taskCount", tasks.size(),
            "doneCount", done,
            "openCount", open,
            "criticalPathLength", longest,
            "cycleDetected", cycleDetected.get()
        );
    }

    private List<String> parseDeps(String json) {
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    private int longestPathLen(String key,
                               Map<String, CloseTask> byKey,
                               Map<String, Integer> memo,
                               java.util.Set<String> visiting,
                               java.util.concurrent.atomic.AtomicBoolean cycleDetected) {
        if (memo.containsKey(key)) return memo.get(key);
        if (!byKey.containsKey(key)) return 0;
        if (!visiting.add(key)) {
            cycleDetected.set(true);
            return 1;
        }
        List<String> deps = parseDeps(byKey.get(key).getDependsOnJson());
        int bestDep = 0;
        for (String dep : deps) {
            bestDep = Math.max(bestDep, longestPathLen(dep, byKey, memo, visiting, cycleDetected));
        }
        visiting.remove(key);
        int result = 1 + bestDep;
        memo.put(key, result);
        return result;
    }

    private UUID requireTenant() {
        UUID id = TenantContext.tenantId();
        if (id == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return id;
    }
}
