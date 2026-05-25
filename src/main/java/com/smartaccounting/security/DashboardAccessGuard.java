package com.smartaccounting.security;

import com.smartaccounting.service.AuthSessionService;
import com.smartaccounting.service.DashboardRoleResolver;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("dashboardAccessGuard")
public class DashboardAccessGuard {
    private final AuthSessionService authSessionService;
    private final DashboardRoleResolver dashboardRoleResolver;

    public DashboardAccessGuard(
        AuthSessionService authSessionService,
        DashboardRoleResolver dashboardRoleResolver
    ) {
        this.authSessionService = authSessionService;
        this.dashboardRoleResolver = dashboardRoleResolver;
    }

    public boolean canAccess(Authentication authentication, String requestedRole) {
        if (authentication == null || !authentication.isAuthenticated() || requestedRole == null || requestedRole.isBlank()) {
            return false;
        }
        UUID tenantId = TenantContext.tenantId();
        UUID userId = TenantContext.userId();
        if (tenantId == null || userId == null) {
            return false;
        }
        return dashboardRoleResolver.canViewDashboard(
            authSessionService.loadEffectivePermissions(tenantId, userId, null),
            requestedRole
        );
    }
}
