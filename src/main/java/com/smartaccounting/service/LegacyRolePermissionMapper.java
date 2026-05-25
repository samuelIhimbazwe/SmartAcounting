package com.smartaccounting.service;

import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Fallback permission sets when a user has no {@code user_roles} rows yet (legacy {@code users.role} only).
 * Mirrors V82 migration defaults.
 */
@Component
public class LegacyRolePermissionMapper {

    public Set<String> permissionsForLegacyRole(String role) {
        if (role == null || role.isBlank()) {
            return Set.of();
        }
        String r = role.trim().toUpperCase(Locale.ROOT);
        return switch (r) {
            case "CEO", "OWNER", "BUSINESS_OWNER" -> allPermissions();
            case "CFO" -> Set.of(
                "FINANCE_READ", "FINANCE_WRITE", "FINANCE_CLOSE",
                "PAYROLL_READ", "PAYROLL_WRITE",
                "EBM_AUDIT", "REPORTS_EXPORT",
                "ANALYTICS_ALL", "TENANT_CONFIG"
            );
            case "SALES", "SALES_MANAGER" -> Set.of(
                "POS_ACCESS", "EBM_SUBMIT", "INVENTORY_READ",
                "ANALYTICS_OWN", "REPORTS_EXPORT"
            );
            case "OPERATIONS", "OPS_MANAGER" -> Set.of(
                "INVENTORY_READ", "INVENTORY_WRITE", "INVENTORY_SHRINKAGE",
                "PROCUREMENT_READ", "PROCUREMENT_WRITE",
                "POS_ACCESS", "ANALYTICS_OWN"
            );
            case "HR", "HR_MANAGER" -> Set.of(
                "HR_READ", "HR_WRITE", "PAYROLL_READ", "ANALYTICS_OWN"
            );
            case "MARKETING", "MARKETING_MANAGER" -> Set.of(
                "ANALYTICS_ALL", "AI_COPILOT", "REPORTS_EXPORT"
            );
            case "ACCOUNTING", "ACCOUNTING_CONTROLLER" -> Set.of(
                "FINANCE_READ", "FINANCE_WRITE",
                "EBM_AUDIT", "PAYROLL_READ", "REPORTS_EXPORT"
            );
            case "CASHIER", "POS_OPERATOR" -> Set.of(
                "POS_ACCESS", "POS_TILL_MANAGE", "POS_RETURNS", "EBM_SUBMIT"
            );
            default -> allPermissions();
        };
    }

    private static Set<String> allPermissions() {
        return Set.of(
            "POS_ACCESS", "POS_TILL_MANAGE", "POS_RETURNS", "POS_DISCOUNT",
            "EBM_SUBMIT", "EBM_AUDIT", "EBM_CONFIG",
            "INVENTORY_READ", "INVENTORY_WRITE", "INVENTORY_SHRINKAGE",
            "PROCUREMENT_READ", "PROCUREMENT_WRITE",
            "FINANCE_READ", "FINANCE_WRITE", "FINANCE_CLOSE",
            "PAYROLL_READ", "PAYROLL_WRITE",
            "HR_READ", "HR_WRITE",
            "ANALYTICS_OWN", "ANALYTICS_ALL",
            "REPORTS_EXPORT", "AI_COPILOT",
            "ASSETS_MANAGE", "TENANT_CONFIG", "USER_MANAGE", "ROLE_MANAGE"
        );
    }
}
