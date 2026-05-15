package com.smartaccounting.signup;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

public final class DbUserRoleAuthorities {
    private DbUserRoleAuthorities() {
    }

    public static List<GrantedAuthority> fromStoredRole(String dbRole) {
        String r = dbRole == null ? "ACCOUNTING" : dbRole.trim().toUpperCase();
        String authority = switch (r) {
            case "CEO" -> "ROLE_CEO";
            case "CFO" -> "ROLE_CFO";
            case "SALES" -> "ROLE_SALES_MANAGER";
            case "OPERATIONS" -> "ROLE_OPS_MANAGER";
            case "HR" -> "ROLE_HR_MANAGER";
            case "MARKETING" -> "ROLE_MARKETING_MANAGER";
            case "ACCOUNTING" -> "ROLE_ACCOUNTING_CONTROLLER";
            default -> "ROLE_ACCOUNTING_CONTROLLER";
        };
        return List.of(new SimpleGrantedAuthority(authority));
    }
}
