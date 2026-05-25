package com.smartaccounting.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LegacyRolePermissionMapperTest {
    private final LegacyRolePermissionMapper mapper = new LegacyRolePermissionMapper();

    @Test
    void cashierHasPosAccessOnly() {
        var perms = mapper.permissionsForLegacyRole("CASHIER");
        assertTrue(perms.contains("POS_ACCESS"));
        assertFalse(perms.contains("FINANCE_WRITE"));
    }

    @Test
    void ceoHasAnalyticsAll() {
        var perms = mapper.permissionsForLegacyRole("CEO");
        assertTrue(perms.contains("ANALYTICS_ALL"));
        assertTrue(perms.contains("ROLE_MANAGE") || perms.contains("TENANT_CONFIG"));
    }
}
