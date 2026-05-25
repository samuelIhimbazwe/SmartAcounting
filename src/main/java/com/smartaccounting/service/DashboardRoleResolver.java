package com.smartaccounting.service;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Locale;
import java.util.Set;

/**
 * Maps effective permissions to a legacy dashboard role label for web/mobile routing.
 */
@Component
public class DashboardRoleResolver {

    public String resolvePrimaryDashboardRole(Collection<String> permissions, String legacyUsersRole) {
        Set<String> perms = normalize(permissions);
        if (perms.contains("ANALYTICS_ALL") || perms.contains("TENANT_CONFIG") || perms.contains("ROLE_MANAGE")) {
            return "CEO";
        }
        if (perms.contains("FINANCE_CLOSE") || (perms.contains("FINANCE_WRITE") && perms.contains("PAYROLL_WRITE"))) {
            return "CFO";
        }
        if (perms.contains("FINANCE_READ") || perms.contains("FINANCE_WRITE") || perms.contains("EBM_AUDIT")) {
            if (!perms.contains("POS_ACCESS") && !perms.contains("INVENTORY_WRITE")) {
                return "ACCOUNTING";
            }
        }
        if (perms.contains("HR_WRITE") || (perms.contains("HR_READ") && perms.contains("PAYROLL_READ"))) {
            return "HR";
        }
        if (perms.contains("AI_COPILOT") && perms.contains("ANALYTICS_ALL") && !perms.contains("POS_ACCESS")) {
            return "MARKETING";
        }
        if (perms.contains("PROCUREMENT_WRITE") || perms.contains("INVENTORY_SHRINKAGE")) {
            return "OPERATIONS";
        }
        if (perms.contains("POS_ACCESS") || perms.contains("INVENTORY_READ")) {
            return "SALES";
        }
        if (legacyUsersRole != null && !legacyUsersRole.isBlank()) {
            return mapLegacyLabel(legacyUsersRole);
        }
        return "CEO";
    }

    public boolean canViewDashboard(Collection<String> permissions, String dashboardRole) {
        Set<String> perms = normalize(permissions);
        if (perms.contains("ANALYTICS_ALL")) {
            return true;
        }
        String target = dashboardRole == null ? "" : dashboardRole.trim().toUpperCase(Locale.ROOT);
        return switch (target) {
            case "CEO" -> perms.contains("TENANT_CONFIG");
            case "CFO" -> perms.contains("FINANCE_READ") || perms.contains("FINANCE_WRITE") || perms.contains("FINANCE_CLOSE");
            case "SALES" -> perms.contains("POS_ACCESS") || perms.contains("ANALYTICS_OWN");
            case "OPERATIONS" -> perms.contains("INVENTORY_READ") || perms.contains("PROCUREMENT_READ");
            case "HR" -> perms.contains("HR_READ") || perms.contains("PAYROLL_READ");
            case "MARKETING" -> perms.contains("AI_COPILOT") || perms.contains("ANALYTICS_ALL");
            case "ACCOUNTING" -> perms.contains("FINANCE_READ") || perms.contains("EBM_AUDIT");
            default -> false;
        };
    }

    private static String mapLegacyLabel(String legacyUsersRole) {
        String r = legacyUsersRole.trim().toUpperCase(Locale.ROOT);
        return switch (r) {
            case "CFO" -> "CFO";
            case "SALES", "SALES_MANAGER" -> "SALES";
            case "OPERATIONS", "OPS_MANAGER" -> "OPERATIONS";
            case "HR", "HR_MANAGER" -> "HR";
            case "MARKETING", "MARKETING_MANAGER" -> "MARKETING";
            case "ACCOUNTING", "ACCOUNTING_CONTROLLER" -> "ACCOUNTING";
            case "CASHIER", "POS_OPERATOR" -> "SALES";
            default -> "CEO";
        };
    }

    private static Set<String> normalize(Collection<String> permissions) {
        if (permissions == null || permissions.isEmpty()) {
            return Set.of();
        }
        return permissions.stream()
            .filter(p -> p != null && !p.isBlank())
            .map(p -> p.trim().toUpperCase(Locale.ROOT))
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }
}
