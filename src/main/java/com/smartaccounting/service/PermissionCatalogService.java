package com.smartaccounting.service;

import com.smartaccounting.repository.PermissionRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class PermissionCatalogService {
    private final PermissionRepository permissionRepository;

    public PermissionCatalogService(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    @Cacheable(value = "permissionCatalog", key = "#code")
    public boolean exists(String code) {
        if (code == null || code.isBlank()) {
            return false;
        }
        return permissionRepository.existsByCode(code.trim().toUpperCase());
    }

    public boolean existsForTenant(String code, UUID tenantId) {
        if (code == null || code.isBlank()) {
            return false;
        }
        String normalized = code.trim().toUpperCase();
        if (permissionRepository.existsByCode(normalized)) {
            return permissionRepository.findByCode(normalized)
                .map(permission -> permission.getTenantId() == null)
                .orElse(false);
        }
        return tenantId != null && permissionRepository.existsForTenant(normalized, tenantId);
    }

    @CacheEvict(value = "permissionCatalog", allEntries = true)
    public void invalidate() {
        // Evict in-memory catalog after migrations or admin catalog changes.
    }
}
