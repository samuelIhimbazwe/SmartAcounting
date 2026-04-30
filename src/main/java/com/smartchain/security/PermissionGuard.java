package com.smartchain.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component("permissionGuard")
public class PermissionGuard {
    private static final Map<String, Set<Permission>> ROLE_PERMISSION_MATRIX = Map.of(
        "ROLE_CEO", EnumSet.allOf(Permission.class),
        "ROLE_CFO", EnumSet.of(
            Permission.FINANCE_WRITE,
            Permission.FINANCE_READ,
            Permission.ACCOUNTING_CLOSE,
            Permission.PROJECTION_REBUILD,
            Permission.FEATURE_FLAG_WRITE,
            Permission.ADMIN_SECURITY_WRITE,
            Permission.ADMIN_TENANT_WRITE,
            Permission.ASSET_READ,
            Permission.ASSET_WRITE,
            Permission.DOCUMENT_READ,
            Permission.DOCUMENT_WRITE
        ),
        "ROLE_ACCOUNTING_CONTROLLER", EnumSet.of(
            Permission.FINANCE_WRITE,
            Permission.FINANCE_READ,
            Permission.ACCOUNTING_CLOSE,
            Permission.DOCUMENT_READ,
            Permission.DOCUMENT_WRITE
        ),
        "ROLE_SALES_MANAGER", EnumSet.of(Permission.SALES_WRITE, Permission.FINANCE_READ, Permission.FINANCE_WRITE),
        "ROLE_OPS_MANAGER", EnumSet.of(Permission.INVENTORY_WRITE, Permission.PROCUREMENT_WRITE, Permission.FINANCE_READ, Permission.FINANCE_WRITE),
        "ROLE_HR_MANAGER", EnumSet.of(Permission.HR_READ, Permission.HR_WRITE),
        "ROLE_MARKETING_MANAGER", EnumSet.of(Permission.FINANCE_READ),
        "ROLE_SERVICE_ACCOUNT", EnumSet.noneOf(Permission.class)
    );

    public boolean has(Authentication auth, String permission) {
        if (auth == null || permission == null || permission.isBlank()) {
            return false;
        }
        Permission requested;
        try {
            requested = Permission.valueOf(permission.toUpperCase());
        } catch (IllegalArgumentException ex) {
            return false;
        }

        Set<String> authorities = auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toSet());
        if (authorities.contains("PERM_" + requested.name())) {
            return true;
        }
        for (String authority : authorities) {
            if (ROLE_PERMISSION_MATRIX.getOrDefault(authority, Set.of()).contains(requested)) {
                return true;
            }
        }
        return false;
    }
}
