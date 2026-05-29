package com.smartaccounting.security;

/**
 * Reusable {@code @PreAuthorize} SpEL fragments backed by DB RBAC ({@link PermissionGuard}).
 * Use as {@code @PreAuthorize(PermissionExpressions.FINANCE_READ)}.
 */
public final class PermissionExpressions {
    private PermissionExpressions() {
    }

    public static final String POS_ACCESS =
        "@permissionGuard.has(authentication, 'POS_ACCESS')";
    public static final String POS_TILL_MANAGE =
        "@permissionGuard.has(authentication, 'POS_TILL_MANAGE')";
    public static final String POS_RETURNS =
        "@permissionGuard.has(authentication, 'POS_RETURNS')";
    public static final String POS_DISCOUNT =
        "@permissionGuard.has(authentication, 'POS_DISCOUNT')";

    public static final String FINANCE_READ =
        "@permissionGuard.has(authentication, 'FINANCE_READ')";
    public static final String FINANCE_WRITE =
        "@permissionGuard.has(authentication, 'FINANCE_WRITE')";
    public static final String FINANCE_CLOSE =
        "@permissionGuard.has(authentication, 'FINANCE_CLOSE')";
    public static final String FINANCE_READ_OR_WRITE =
        "@permissionGuard.hasAny(authentication, 'FINANCE_READ', 'FINANCE_WRITE')";

    public static final String INVENTORY_READ =
        "@permissionGuard.has(authentication, 'INVENTORY_READ')";
    public static final String INVENTORY_WRITE =
        "@permissionGuard.has(authentication, 'INVENTORY_WRITE')";
    public static final String INVENTORY_SHRINKAGE =
        "@permissionGuard.has(authentication, 'INVENTORY_SHRINKAGE')";
    /** Record/list shrinkage — inventory write or legacy shrinkage permission. */
    public static final String INVENTORY_WRITE_OR_SHRINKAGE =
        "@permissionGuard.hasAny(authentication, 'INVENTORY_WRITE', 'INVENTORY_SHRINKAGE')";

    public static final String PROCUREMENT_READ =
        "@permissionGuard.has(authentication, 'PROCUREMENT_READ')";
    public static final String PROCUREMENT_WRITE =
        "@permissionGuard.has(authentication, 'PROCUREMENT_WRITE')";

    public static final String HR_READ =
        "@permissionGuard.has(authentication, 'HR_READ')";
    public static final String HR_WRITE =
        "@permissionGuard.has(authentication, 'HR_WRITE')";
    public static final String HR_READ_OR_WRITE =
        "@permissionGuard.hasAny(authentication, 'HR_READ', 'HR_WRITE')";

    public static final String PAYROLL_READ =
        "@permissionGuard.has(authentication, 'PAYROLL_READ')";
    public static final String PAYROLL_WRITE =
        "@permissionGuard.has(authentication, 'PAYROLL_WRITE')";
    public static final String PAYROLL_READ_OR_WRITE =
        "@permissionGuard.hasAny(authentication, 'PAYROLL_READ', 'PAYROLL_WRITE')";

    public static final String EBM_SUBMIT =
        "@permissionGuard.has(authentication, 'EBM_SUBMIT')";
    public static final String EBM_AUDIT =
        "@permissionGuard.has(authentication, 'EBM_AUDIT')";
    public static final String EBM_CONFIG =
        "@permissionGuard.has(authentication, 'EBM_CONFIG')";

    /** Compliance hub read (EBM audit, VAT calendar, Rwanda filings, PAYE history). */
    public static final String EBM_COMPLIANCE_READ =
        "@permissionGuard.hasAny(authentication, 'EBM_AUDIT', 'EBM_CONFIG', 'FINANCE_READ')";

    /** Compliance hub write (VAT refresh/submit, EIS hooks). */
    public static final String EBM_COMPLIANCE_WRITE =
        "@permissionGuard.hasAny(authentication, 'EBM_AUDIT', 'FINANCE_WRITE')";

    /** PAYE export from compliance or payroll roles. */
    public static final String PAYE_FILING_EXPORT =
        "@permissionGuard.hasAny(authentication, 'EBM_AUDIT', 'PAYROLL_READ', 'PAYROLL_WRITE')";

    public static final String ANALYTICS_OWN =
        "@permissionGuard.has(authentication, 'ANALYTICS_OWN')";
    public static final String ANALYTICS_ALL =
        "@permissionGuard.has(authentication, 'ANALYTICS_ALL')";
    public static final String ANALYTICS_ANY =
        "@permissionGuard.hasAny(authentication, 'ANALYTICS_OWN', 'ANALYTICS_ALL')";

    public static final String REPORTS_EXPORT =
        "@permissionGuard.has(authentication, 'REPORTS_EXPORT')";
    public static final String AI_COPILOT =
        "@permissionGuard.has(authentication, 'AI_COPILOT')";

    public static final String ASSETS_MANAGE =
        "@permissionGuard.has(authentication, 'ASSETS_MANAGE')";
    public static final String TENANT_CONFIG =
        "@permissionGuard.has(authentication, 'TENANT_CONFIG')";
    public static final String STAFF_INVITE =
        "@permissionGuard.has(authentication, 'STAFF_INVITE')";

    /** Customer / CRM views — sales, ops, or finance roles. */
    public static final String CUSTOMER_ACCESS =
        "@permissionGuard.hasAny(authentication, 'POS_ACCESS', 'FINANCE_READ', 'INVENTORY_READ')";

    /** Operational retail (POS, stock, till) without finance-only restriction. */
    public static final String RETAIL_OPS =
        "@permissionGuard.hasAny(authentication, 'POS_ACCESS', 'INVENTORY_READ', 'INVENTORY_WRITE')";

    /** Marketing + promotions + pricing campaigns. */
    public static final String MARKETING_ACCESS =
        "@permissionGuard.hasAny(authentication, 'ANALYTICS_ALL', 'AI_COPILOT', 'POS_DISCOUNT')";

    /** Platform / tenant administration (former CEO/CFO admin). */
    public static final String TENANT_ADMIN =
        "@permissionGuard.hasAny(authentication, 'TENANT_CONFIG', 'USER_MANAGE', 'ROLE_MANAGE')";

    /** Broad operational dashboard (any back-office role). */
    public static final String OPS_DASHBOARD =
        "@permissionGuard.hasAny(authentication, 'ANALYTICS_OWN', 'ANALYTICS_ALL', 'FINANCE_READ', 'INVENTORY_READ')";
}
