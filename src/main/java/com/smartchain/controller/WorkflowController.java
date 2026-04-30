package com.smartchain.controller;

import com.smartchain.dto.CreateWorkflowRuleRequest;
import com.smartchain.service.WorkflowService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workflow")
public class WorkflowController {
    private final WorkflowService workflowService;

    public WorkflowController(WorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @PostMapping("/rules")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO')")
    public Map<String, UUID> createRule(@RequestBody @Valid CreateWorkflowRuleRequest request) {
        return Map.of("ruleId", workflowService.createRule(request));
    }

    @GetMapping("/rules/{id}/evaluate")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO')")
    public Map<String, Object> evaluate(@PathVariable UUID id,
                                        @RequestParam(defaultValue = "true") boolean dryRun,
                                        @RequestParam(required = false) String sampleAmount) {
        Map<String, Object> payload = new HashMap<>();
        if (sampleAmount != null) {
            payload.put("amount", Double.parseDouble(sampleAmount));
        }
        return workflowService.evaluateRule(id, payload, dryRun);
    }
}
