package com.smartchain.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.CreateWorkflowRuleRequest;
import com.smartchain.entity.WorkflowRule;
import com.smartchain.repository.WorkflowRuleRepository;
import com.smartchain.tenant.TenantContext;
import com.smartchain.workflow.WorkflowRuleEngine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class WorkflowService {
    private final WorkflowRuleRepository workflowRuleRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final WorkflowRuleEngine workflowRuleEngine;

    public WorkflowService(WorkflowRuleRepository workflowRuleRepository,
                           AuditService auditService,
                           ObjectMapper objectMapper,
                           WorkflowRuleEngine workflowRuleEngine) {
        this.workflowRuleRepository = workflowRuleRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.workflowRuleEngine = workflowRuleEngine;
    }

    @Transactional
    public UUID createRule(CreateWorkflowRuleRequest request) {
        UUID tenantId = requireTenant();
        WorkflowRule rule = new WorkflowRule();
        rule.setId(UUID.randomUUID());
        rule.setTenantId(tenantId);
        rule.setName(request.name());
        rule.setTriggerEvent(request.triggerEvent());
        rule.setConditionsJson(toJson(request.conditions()));
        rule.setActionsJson(toJson(request.actions()));
        rule.setActive(request.active());
        rule.setCreatedAt(Instant.now());
        workflowRuleRepository.save(rule);
        workflowRuleEngine.refreshCache();
        auditService.logAction("WORKFLOW_RULE_CREATED", "WORKFLOW_RULE", "{}", "{\"id\":\"" + rule.getId() + "\"}");
        return rule.getId();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JSON serialization failed", e);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> evaluateRule(UUID ruleId, Map<String, Object> payload, boolean dryRun) {
        WorkflowRule rule = workflowRuleRepository.findById(ruleId)
            .orElseThrow(() -> new IllegalArgumentException("Rule not found"));
        if (TenantContext.tenantId() == null || !TenantContext.tenantId().equals(rule.getTenantId())) {
            throw new IllegalArgumentException("Rule not accessible for current tenant");
        }
        return workflowRuleEngine.evaluate(rule.getTenantId(), rule.getTriggerEvent(), payload, dryRun);
    }
}
