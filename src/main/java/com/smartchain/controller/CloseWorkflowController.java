package com.smartchain.controller;

import com.smartchain.dto.CreateCloseTaskRequest;
import com.smartchain.entity.CloseTask;
import com.smartchain.service.CloseWorkflowService;
import jakarta.validation.Valid;
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
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> createTask(@RequestBody @Valid CreateCloseTaskRequest request) {
        return Map.of("taskId", service.createTask(request));
    }

    @PostMapping("/tasks/{period}/{taskKey}/complete")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, String> complete(@PathVariable String period, @PathVariable String taskKey) {
        service.completeTask(period, taskKey);
        return Map.of("status", "DONE");
    }

    @GetMapping("/tasks/{period}")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public List<CloseTask> list(@PathVariable String period) {
        return service.list(period);
    }

    @GetMapping("/tasks/{period}/critical-path")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, Object> criticalPath(@PathVariable String period) {
        return service.criticalPathSummary(period);
    }
}
