package com.smartchain.service;

import com.smartchain.entity.TenantFeatureFlag;
import com.smartchain.repository.TenantFeatureFlagRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class FeatureFlagService {
    private final TenantFeatureFlagRepository repository;

    public FeatureFlagService(TenantFeatureFlagRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Map<String, Object> setFlag(String featureKey, boolean enabled) {
        UUID tenantId = requireTenant();
        String normalizedKey = featureKey.toLowerCase();
        TenantFeatureFlag flag = repository.findByTenantIdAndFeatureKey(tenantId, normalizedKey)
            .orElseGet(() -> {
                TenantFeatureFlag created = new TenantFeatureFlag();
                created.setId(UUID.randomUUID());
                created.setTenantId(tenantId);
                created.setFeatureKey(normalizedKey);
                return created;
            });
        flag.setEnabled(enabled);
        flag.setUpdatedAt(Instant.now());
        repository.save(flag);
        return Map.of("featureKey", normalizedKey, "enabled", enabled);
    }

    @Transactional(readOnly = true)
    public Map<String, Boolean> allFlags() {
        UUID tenantId = requireTenant();
        Map<String, Boolean> result = new LinkedHashMap<>();
        for (TenantFeatureFlag flag : repository.findByTenantIdOrderByFeatureKeyAsc(tenantId)) {
            result.put(flag.getFeatureKey(), flag.isEnabled());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public boolean isEnabled(String featureKey) {
        UUID tenantId = requireTenant();
        return repository.findByTenantIdAndFeatureKey(tenantId, featureKey.toLowerCase())
            .map(TenantFeatureFlag::isEnabled)
            .orElse(false);
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
