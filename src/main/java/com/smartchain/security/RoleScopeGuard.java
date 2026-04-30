package com.smartchain.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("roleScopeGuard")
public class RoleScopeGuard {
    private static final Map<String, String> ROLE_TO_DASHBOARD = Map.of(
        "ROLE_CEO", "ceo",
        "ROLE_CFO", "cfo",
        "ROLE_SALES_MANAGER", "sales",
        "ROLE_OPS_MANAGER", "operations",
        "ROLE_HR_MANAGER", "hr",
        "ROLE_MARKETING_MANAGER", "marketing",
        "ROLE_ACCOUNTING_CONTROLLER", "accounting"
    );

    public boolean canAccessRole(Authentication auth, String requestedRole) {
        if (auth == null || requestedRole == null) {
            return false;
        }
        String normalized = requestedRole.toLowerCase();
        return auth.getAuthorities().stream().anyMatch(authority -> {
            if ("ROLE_CEO".equals(authority.getAuthority())) {
                return true;
            }
            return normalized.equals(ROLE_TO_DASHBOARD.get(authority.getAuthority()));
        });
    }
}
