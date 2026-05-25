package com.smartaccounting.service;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DashboardRoleResolverTest {
    private final DashboardRoleResolver resolver = new DashboardRoleResolver();

    @Test
    void analyticsAllCanViewEveryDashboard() {
        List<String> perms = List.of("ANALYTICS_ALL");
        assertTrue(resolver.canViewDashboard(perms, "CEO"));
        assertTrue(resolver.canViewDashboard(perms, "CFO"));
        assertTrue(resolver.canViewDashboard(perms, "HR"));
    }

    @Test
    void cashierMapsToSalesDashboard() {
        Set<String> perms = Set.of("POS_ACCESS", "POS_TILL_MANAGE", "EBM_SUBMIT");
        assertEquals("SALES", resolver.resolvePrimaryDashboardRole(perms, "CASHIER"));
        assertTrue(resolver.canViewDashboard(perms, "SALES"));
        assertFalse(resolver.canViewDashboard(perms, "CEO"));
        assertFalse(resolver.canViewDashboard(perms, "CFO"));
    }

    @Test
    void financeReadMapsToAccountingWhenNoPos() {
        Set<String> perms = Set.of("FINANCE_READ", "EBM_AUDIT", "REPORTS_EXPORT");
        assertEquals("ACCOUNTING", resolver.resolvePrimaryDashboardRole(perms, "ACCOUNTING"));
        assertTrue(resolver.canViewDashboard(perms, "ACCOUNTING"));
    }
}
