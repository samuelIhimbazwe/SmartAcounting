package com.smartchain.workflow;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.alerts.SseEventBroadcaster;
import com.smartchain.entity.ApprovalRequest;
import com.smartchain.entity.WorkflowRule;
import com.smartchain.repository.ApprovalRequestRepository;
import com.smartchain.repository.WorkflowRuleRepository;
import com.smartchain.service.ActionQueueService;
import com.smartchain.service.WebhookDispatchService;
import com.smartchain.tenant.TenantContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WorkflowRuleEngine {
    private final WorkflowRuleRepository ruleRepository;
    private final ApprovalRequestRepository approvalRequestRepository;
    private final ActionQueueService actionQueueService;
    private final WebhookDispatchService webhookDispatchService;
    private final SseEventBroadcaster sseEventBroadcaster;
    private final ObjectMapper objectMapper;
    private final Map<UUID, List<WorkflowRule>> cache = new ConcurrentHashMap<>();

    public WorkflowRuleEngine(WorkflowRuleRepository ruleRepository,
                              ApprovalRequestRepository approvalRequestRepository,
                              ActionQueueService actionQueueService,
                              WebhookDispatchService webhookDispatchService,
                              SseEventBroadcaster sseEventBroadcaster,
                              ObjectMapper objectMapper) {
        this.ruleRepository = ruleRepository;
        this.approvalRequestRepository = approvalRequestRepository;
        this.actionQueueService = actionQueueService;
        this.webhookDispatchService = webhookDispatchService;
        this.sseEventBroadcaster = sseEventBroadcaster;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelayString = "${smartchain.workflow.cache-refresh-ms:30000}")
    public void refreshCache() {
        Map<UUID, List<WorkflowRule>> grouped = new HashMap<>();
        for (WorkflowRule r : ruleRepository.findAll()) {
            if (!r.isActive()) continue;
            grouped.computeIfAbsent(r.getTenantId(), k -> new ArrayList<>()).add(r);
        }
        cache.clear();
        cache.putAll(grouped);
    }

    @Transactional
    public Map<String, Object> evaluate(UUID tenantId, String eventType, Map<String, Object> payload, boolean dryRun) {
        List<WorkflowRule> rules = cache.getOrDefault(tenantId, List.of());
        List<Map<String, Object>> matched = new ArrayList<>();
        List<Map<String, Object>> diagnostics = new ArrayList<>();
        for (WorkflowRule rule : rules) {
            if (!eventType.equalsIgnoreCase(rule.getTriggerEvent())) continue;
            EvaluationResult er = evaluateConditions(rule.getConditionsJson(), payload);
            diagnostics.add(Map.of("ruleId", rule.getId().toString(), "passed", er.passed(), "details", er.details()));
            if (er.passed()) {
                matched.add(Map.of("ruleId", rule.getId().toString(), "name", rule.getName()));
                if (!dryRun) {
                    executeActions(tenantId, rule, payload);
                }
            }
        }
        return Map.of("matched", !matched.isEmpty(), "matchedRules", matched, "diagnostics", diagnostics);
    }

    private EvaluationResult evaluateConditions(String conditionJson, Map<String, Object> payload) {
        try {
            Map<String, Object> root = objectMapper.readValue(conditionJson, new TypeReference<>() {});
            return evalNode(root, payload);
        } catch (Exception e) {
            return new EvaluationResult(false, List.of(Map.of("error", "invalid_condition_json")));
        }
    }

    @SuppressWarnings("unchecked")
    private EvaluationResult evalNode(Map<String, Object> node, Map<String, Object> payload) {
        if (node.containsKey("and")) {
            List<Map<String, Object>> children = (List<Map<String, Object>>) node.get("and");
            List<Map<String, Object>> details = new ArrayList<>();
            boolean all = true;
            for (Map<String, Object> c : children) {
                EvaluationResult er = evalNode(c, payload);
                all = all && er.passed();
                details.addAll(er.details());
            }
            return new EvaluationResult(all, details);
        }
        if (node.containsKey("or")) {
            List<Map<String, Object>> children = (List<Map<String, Object>>) node.get("or");
            List<Map<String, Object>> details = new ArrayList<>();
            boolean any = false;
            for (Map<String, Object> c : children) {
                EvaluationResult er = evalNode(c, payload);
                any = any || er.passed();
                details.addAll(er.details());
            }
            return new EvaluationResult(any, details);
        }
        String field = String.valueOf(node.get("field"));
        String op = String.valueOf(node.getOrDefault("op", "EQ")).toUpperCase();
        Object val = node.get("value");
        Object current = payload.get(field);
        boolean passed = current != null && compare(current, val, op);
        return new EvaluationResult(passed, List.of(Map.of("field", field, "op", op, "expected", String.valueOf(val), "actual", String.valueOf(current), "passed", passed)));
    }

    @SuppressWarnings("unchecked")
    private void executeActions(UUID tenantId, WorkflowRule rule, Map<String, Object> payload) {
        try {
            List<Map<String, Object>> actions = objectMapper.readValue(rule.getActionsJson(), new TypeReference<>() {});
            TenantContext.set(tenantId, UUID.randomUUID());
            for (Map<String, Object> action : actions) {
                String type = String.valueOf(action.get("type")).toUpperCase();
                switch (type) {
                    case "REQUIRE_APPROVAL" -> {
                        ApprovalRequest req = new ApprovalRequest();
                        req.setId(UUID.randomUUID());
                        req.setTenantId(tenantId);
                        req.setRequestType("WORKFLOW_APPROVAL");
                        req.setReferenceId(String.valueOf(payload.getOrDefault("id", "n/a")));
                        List<String> approvers = (List<String>) action.getOrDefault("approvers", List.of("cfo"));
                        req.setApproverRole(approvers.isEmpty() ? "cfo" : approvers.get(0).toLowerCase());
                        req.setStatus("PENDING");
                        req.setPayload(objectMapper.writeValueAsString(payload));
                        req.setCreatedAt(Instant.now());
                        approvalRequestRepository.save(req);
                        sseEventBroadcaster.broadcastToRole(tenantId, req.getApproverRole(), "workflow.approval", Map.of("approvalId", req.getId().toString()));
                    }
                    case "CREATE_ACTION" -> actionQueueService.enqueue("WORKFLOW_ACTION", rule.getId().toString(), objectMapper.writeValueAsString(payload));
                    case "SEND_WEBHOOK" -> webhookDispatchService.dispatch(rule.getTriggerEvent(), payload);
                    case "NOTIFY" -> {
                        String targetRole = String.valueOf(action.getOrDefault("targetRole", "ceo"));
                        sseEventBroadcaster.broadcastToRole(tenantId, targetRole, "workflow.notify", payload);
                    }
                }
            }
        } catch (Exception ignored) {
        } finally {
            TenantContext.clear();
        }
    }

    private boolean compare(Object current, Object expected, String op) {
        try {
            switch (op) {
                case "EQ" -> { return String.valueOf(current).equalsIgnoreCase(String.valueOf(expected)); }
                case "CONTAINS" -> { return String.valueOf(current).contains(String.valueOf(expected)); }
                case "IN" -> { return String.valueOf(expected).contains(String.valueOf(current)); }
                default -> {
                    double c = Double.parseDouble(String.valueOf(current));
                    double e = Double.parseDouble(String.valueOf(expected));
                    return switch (op) {
                        case "GT" -> c > e;
                        case "LT" -> c < e;
                        case "GTE" -> c >= e;
                        case "LTE" -> c <= e;
                        default -> false;
                    };
                }
            }
        } catch (Exception ex) {
            return false;
        }
    }

    private record EvaluationResult(boolean passed, List<Map<String, Object>> details) {}
}
