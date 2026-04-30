package com.smartchain.repository;

import com.smartchain.entity.TenantFeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantFeatureFlagRepository extends JpaRepository<TenantFeatureFlag, UUID> {
    Optional<TenantFeatureFlag> findByTenantIdAndFeatureKey(UUID tenantId, String featureKey);
    List<TenantFeatureFlag> findByTenantIdOrderByFeatureKeyAsc(UUID tenantId);
}
