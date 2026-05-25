package com.smartaccounting.service;

import com.smartaccounting.dto.rbac.PermissionResponse;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.repository.PermissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class TenantCustomPermissionService {
    private static final int MAX_CODE_LENGTH = 50;
    private static final String CODE_PREFIX = "CUSTOM_";

    private final PermissionRepository permissionRepository;
    private final PermissionCatalogService permissionCatalogService;
    private final TenantPermissionCacheService tenantPermissionCacheService;
    private final RbacResponseMapper rbacResponseMapper;

    public TenantCustomPermissionService(
        PermissionRepository permissionRepository,
        PermissionCatalogService permissionCatalogService,
        TenantPermissionCacheService tenantPermissionCacheService,
        RbacResponseMapper rbacResponseMapper
    ) {
        this.permissionRepository = permissionRepository;
        this.permissionCatalogService = permissionCatalogService;
        this.tenantPermissionCacheService = tenantPermissionCacheService;
        this.rbacResponseMapper = rbacResponseMapper;
    }

    @Transactional
    public Permission ensureCustomPermission(
        UUID tenantId,
        String label,
        String description,
        String category,
        List<String> optionalGrants
    ) {
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context required");
        }
        String normalizedLabel = label == null ? "" : label.trim();
        if (normalizedLabel.isBlank()) {
            throw new IllegalArgumentException("Custom permission label is required");
        }

        String code = toUniqueCode(tenantId, normalizedLabel);
        Permission existing = permissionRepository.findByTenantIdAndCode(tenantId, code).orElse(null);
        if (existing != null) {
            return existing;
        }

        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setTenantId(tenantId);
        permission.setCode(code);
        permission.setLabel(normalizedLabel);
        permission.setDescription(description == null ? "" : description.trim());
        permission.setCategory(category == null || category.isBlank() ? "CUSTOM" : category.trim().toUpperCase(Locale.ROOT));
        permission.setDangerous(false);
        permission.setCreatedAt(LocalDateTime.now());
        permission.setGrantsPlatformCodes(sanitizeGrants(optionalGrants));

        Permission saved = permissionRepository.save(permission);
        permissionCatalogService.invalidate();
        return saved;
    }

    @Transactional
    public PermissionResponse updateGrants(UUID tenantId, String permissionCode, List<String> grantsPlatformCodes) {
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context required");
        }
        String code = normalizeCode(permissionCode);
        Permission permission = permissionRepository.findByTenantIdAndCode(tenantId, code)
            .orElseThrow(() -> new IllegalArgumentException("Custom permission not found"));

        List<String> grants = sanitizeGrants(grantsPlatformCodes);
        validatePlatformGrants(grants);
        permission.setGrantsPlatformCodes(grants);

        Permission saved = permissionRepository.save(permission);
        permissionCatalogService.invalidate();
        tenantPermissionCacheService.invalidateTenant(tenantId);
        return rbacResponseMapper.toPermissionResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<Permission> listForTenant(UUID tenantId) {
        if (tenantId == null) {
            return List.of();
        }
        return permissionRepository.findAllByTenantIdOrderByLabelAsc(tenantId);
    }

    public static String toUniqueCode(UUID tenantId, String label) {
        String slug = slugify(label);
        String base = CODE_PREFIX + slug;
        if (base.length() <= MAX_CODE_LENGTH) {
            return base;
        }
        String suffix = "_" + tenantId.toString().substring(0, 4);
        int keep = MAX_CODE_LENGTH - suffix.length();
        return base.substring(0, Math.max(CODE_PREFIX.length() + 1, keep)) + suffix;
    }

    private static String slugify(String label) {
        String upper = label.toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+|_+$", "");
        if (upper.isBlank()) {
            upper = "CAPABILITY";
        }
        if (upper.length() > MAX_CODE_LENGTH - CODE_PREFIX.length()) {
            upper = upper.substring(0, MAX_CODE_LENGTH - CODE_PREFIX.length());
        }
        return upper;
    }

    private static List<String> sanitizeGrants(List<String> grants) {
        if (grants == null || grants.isEmpty()) {
            return List.of();
        }
        Set<String> unique = new LinkedHashSet<>();
        for (String grant : grants) {
            if (grant != null && !grant.isBlank()) {
                unique.add(grant.trim().toUpperCase(Locale.ROOT));
            }
        }
        return new ArrayList<>(unique);
    }

    private void validatePlatformGrants(List<String> grants) {
        if (grants.isEmpty()) {
            return;
        }
        List<Permission> matches = permissionRepository.findAllByCodeIn(grants);
        Set<String> platformCodes = new LinkedHashSet<>();
        for (Permission permission : matches) {
            if (permission.getTenantId() == null) {
                platformCodes.add(permission.getCode());
            }
        }
        List<String> missing = grants.stream().filter(code -> !platformCodes.contains(code)).toList();
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("Unknown platform permission codes: " + missing);
        }
    }

    private static String normalizeCode(String permissionCode) {
        if (permissionCode == null || permissionCode.isBlank()) {
            throw new IllegalArgumentException("Permission code is required");
        }
        return permissionCode.trim().toUpperCase(Locale.ROOT);
    }
}
