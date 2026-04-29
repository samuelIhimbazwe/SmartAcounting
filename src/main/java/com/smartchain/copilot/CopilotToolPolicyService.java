package com.smartchain.copilot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;

@Service
public class CopilotToolPolicyService {
    private final boolean actionRequiresApproval;
    private final boolean defaultDryRun;
    private final long actionApprovalTtlSeconds;

    private static final Map<String, Set<String>> ROLE_TOOLS = Map.of(
        "ceo", Set.of("FORECAST", "ANOMALY", "DASHBOARD_KPI", "ARAP_AGING", "INVENTORY_RISK", "ACTION_QUEUE", "HR_HEADCOUNT", "SALES_PIPELINE"),
        "cfo", Set.of("FORECAST", "ANOMALY", "DASHBOARD_KPI", "ARAP_AGING", "INVENTORY_RISK", "ACTION_QUEUE", "HR_HEADCOUNT", "SALES_PIPELINE"),
        "accounting", Set.of("FORECAST", "ANOMALY", "DASHBOARD_KPI", "ARAP_AGING"),
        "operations", Set.of("FORECAST", "ANOMALY", "DASHBOARD_KPI", "INVENTORY_RISK"),
        "sales", Set.of("FORECAST", "DASHBOARD_KPI", "SALES_PIPELINE"),
        "hr", Set.of("DASHBOARD_KPI", "HR_HEADCOUNT"),
        "marketing", Set.of("DASHBOARD_KPI", "FORECAST")
    );

    public CopilotToolPolicyService(
        @Value("${smartchain.copilot.agent.policy.action-requires-approval:true}") boolean actionRequiresApproval,
        @Value("${smartchain.copilot.agent.policy.default-dry-run:false}") boolean defaultDryRun,
        @Value("${smartchain.copilot.agent.policy.action-approval-ttl-seconds:1800}") long actionApprovalTtlSeconds
    ) {
        this.actionRequiresApproval = actionRequiresApproval;
        this.defaultDryRun = defaultDryRun;
        this.actionApprovalTtlSeconds = actionApprovalTtlSeconds;
    }

    public boolean canUseTool(String role, String tool) {
        if (role == null || tool == null) return false;
        return ROLE_TOOLS.getOrDefault(role.toLowerCase(), Set.of()).contains(tool);
    }

    public boolean isDryRun(Boolean requestedDryRun) {
        return requestedDryRun != null ? requestedDryRun : defaultDryRun;
    }

    public boolean canExecuteActionWrite(String role, boolean dryRun, Boolean approveActions) {
        if (!canUseTool(role, "ACTION_QUEUE")) return false;
        if (dryRun) return false;
        if (!actionRequiresApproval) return true;
        return Boolean.TRUE.equals(approveActions);
    }

    public boolean actionNeedsApproval() {
        return actionRequiresApproval;
    }

    public long actionApprovalTtlSeconds() {
        return actionApprovalTtlSeconds;
    }
}
