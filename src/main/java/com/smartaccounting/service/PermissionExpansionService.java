package com.smartaccounting.service;

import com.smartaccounting.entity.Permission;
import com.smartaccounting.repository.PermissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class PermissionExpansionService {
    private final PermissionRepository permissionRepository;

    public PermissionExpansionService(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    @Transactional(readOnly = true)
    public Set<String> expandForTenant(UUID tenantId, Collection<String> assignedCodes) {
        if (assignedCodes == null || assignedCodes.isEmpty()) {
            return Set.of();
        }
        Set<String> expanded = new LinkedHashSet<>();
        for (String raw : assignedCodes) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String code = raw.trim().toUpperCase(Locale.ROOT);
            expanded.add(code);
            if (tenantId == null) {
                continue;
            }
            permissionRepository.findByTenantIdAndCode(tenantId, code).ifPresent(custom -> {
                List<String> grants = custom.getGrantsPlatformCodes();
                if (grants != null) {
                    for (String grant : grants) {
                        if (grant != null && !grant.isBlank()) {
                            expanded.add(grant.trim().toUpperCase(Locale.ROOT));
                        }
                    }
                }
            });
        }
        return expanded;
    }

    @Transactional(readOnly = true)
    public boolean tenantHasCode(UUID tenantId, String permissionCode) {
        if (permissionCode == null || permissionCode.isBlank()) {
            return false;
        }
        String code = permissionCode.trim().toUpperCase(Locale.ROOT);
        if (permissionRepository.existsByCode(code)) {
            Permission platform = permissionRepository.findByCode(code).orElse(null);
            return platform != null && platform.getTenantId() == null;
        }
        return tenantId != null && permissionRepository.existsForTenant(code, tenantId);
    }
}
