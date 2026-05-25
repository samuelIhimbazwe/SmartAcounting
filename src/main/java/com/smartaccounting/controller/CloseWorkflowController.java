package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateCloseTaskRequest;
import com.smartaccounting.entity.CloseTask;
import com.smartaccounting.service.CloseWorkflowService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounting/close")
public class CloseWorkflowController {
    private final CloseWorkflowService service;

    public CloseWorkflowController(CloseWorkflowService service) {
        this.service = service;
    }

    @PostMapping("/tasks")
    @PreAuthorize(PermissionExpressions.FINANCE_CLOSE)
    public Map<String, UUID> createTask(@RequestBody @Valid CreateCloseTaskRequest request) {
        return Map.of("taskId", service.createTask(request));
    }

    @PostMapping("/tasks/{period}/{taskKey}/complete")
    @PreAuthorize(PermissionExpressions.FINANCE_CLOSE)
    public Map<String, String> complete(@PathVariable String period, @PathVariable String taskKey) {
        service.completeTask(period, taskKey);
        return Map.of("status", "DONE");
    }

    @GetMapping("/tasks/{period}")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public List<CloseTask> list(@PathVariable String period) {
        return service.list(period);
    }

    @GetMapping("/tasks/{period}/critical-path")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public Map<String, Object> criticalPath(@PathVariable String period) {
        return service.criticalPathSummary(period);
    }
}
