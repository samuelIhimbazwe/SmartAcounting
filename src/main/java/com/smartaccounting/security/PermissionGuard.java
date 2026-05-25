package com.smartaccounting.security;

import com.smartaccounting.repository.UserRepository;
import com.smartaccounting.repository.UserRoleRepository;
import com.smartaccounting.service.PermissionCatalogService;
import com.smartaccounting.service.PermissionExpansionService;
import com.smartaccounting.service.TenantPermissionCacheService;
import com.smartaccounting.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Central permission check bean, used in every {@code @PreAuthorize} expression:
 *
 *   {@code @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_READ')")}
 */
@Component("permissionGuard")
public class PermissionGuard {
    private static final Logger log = LoggerFactory.getLogger(PermissionGuard.class);

    private final UserRoleRepository userRoleRepository;
    private final UserRepository userRepository;
    private final TenantPermissionCacheService cacheService;
    private final PermissionCatalogService permissionCatalogService;
    private final PermissionExpansionService permissionExpansionService;

    public PermissionGuard(
        UserRoleRepository userRoleRepository,
        UserRepository userRepository,
        TenantPermissionCacheService cacheService,
        PermissionCatalogService permissionCatalogService,
        PermissionExpansionService permissionExpansionService
    ) {
        this.userRoleRepository = userRoleRepository;
        this.userRepository = userRepository;
        this.cacheService = cacheService;
        this.permissionCatalogService = permissionCatalogService;
        this.permissionExpansionService = permissionExpansionService;
    }

    public boolean has(Authentication authentication, String permissionCode) {
        return hasPermission(authentication, permissionCode);
    }

    public boolean hasPermission(Authentication authentication, String permissionCode) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        if (permissionCode == null || permissionCode.isBlank()) {
            return false;
        }
        String code = permissionCode.trim().toUpperCase();

        if (isServiceAccount(authentication)) {
            return authorityPermissions(authentication).contains(code);
        }

        UUID userId = resolveUserId(authentication);
        if (userId == null) {
            return false;
        }

        UUID tenantId = resolveTenantId(userId);
        if (tenantId == null) {
            return false;
        }

        if (!permissionCatalogService.existsForTenant(code, tenantId)
            && !permissionExpansionService.tenantHasCode(tenantId, code)) {
            log.warn(
                "RBAC: Unknown permission code '{}' used in @PreAuthorize — not in platform or tenant catalog.",
                code
            );
            return false;
        }

        Set<String> permissions = loadPermissions(userId, tenantId);
        boolean granted = permissions.contains(code);
        if (!granted) {
            log.warn(
                "RBAC DENY: user={} tenant={} permission={} available={}",
                userId,
                tenantId,
                code,
                permissions
            );
        }
        return granted;
    }

    public boolean hasAny(Authentication authentication, String... permissionCodes) {
        if (permissionCodes == null) {
            return false;
        }
        for (String permissionCode : permissionCodes) {
            if (hasPermission(authentication, permissionCode)) {
                return true;
            }
        }
        return false;
    }

    public boolean isSelfServiceOwner(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        UUID userId = resolveUserId(authentication);
        UUID tenantId = resolveTenantId(userId);
        if (userId == null || tenantId == null) {
            return false;
        }
        return userRepository.findById(userId)
            .filter(user -> tenantId.equals(user.getTenantId()))
            .map(user -> user.isSelfServiceOwner())
            .orElse(false);
    }

    public void invalidateUserPermissions(UUID userId) {
        userRepository.findById(userId).ifPresent(user ->
            cacheService.invalidateUser(user.getTenantId(), userId));
    }

    public void invalidateTenantPermissions(UUID tenantId) {
        cacheService.invalidateTenant(tenantId);
    }

    private Set<String> loadPermissions(UUID userId, UUID tenantId) {
        Set<String> cached = cacheService.getPermissions(tenantId, userId);
        if (cached != null) {
            return cached;
        }

        Set<String> codes = permissionExpansionService.expandForTenant(
            tenantId,
            userRoleRepository.findPermissionCodesByUserId(userId)
        );
        cacheService.putPermissions(tenantId, userId, codes);
        return codes;
    }

    private boolean isServiceAccount(Authentication auth) {
        return auth.getAuthorities().stream()
            .anyMatch(authority -> "ROLE_SERVICE_ACCOUNT".equals(authority.getAuthority()));
    }

    private Set<String> authorityPermissions(Authentication auth) {
        return auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .filter(authority -> authority.startsWith("PERM_"))
            .map(authority -> authority.substring(5))
            .collect(Collectors.toSet());
    }

    private UUID resolveUserId(Authentication auth) {
        UUID fromContext = TenantContext.userId();
        if (fromContext != null) {
            return fromContext;
        }
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private UUID resolveTenantId(UUID userId) {
        UUID fromContext = TenantContext.tenantId();
        if (fromContext != null) {
            return fromContext;
        }
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
            .map(user -> user.getTenantId())
            .orElse(null);
    }
}
