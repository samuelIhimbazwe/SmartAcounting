package com.smartaccounting.repository;

import com.smartaccounting.entity.TenantSetup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TenantSetupRepository extends JpaRepository<TenantSetup, UUID> {
    Optional<TenantSetup> findByTenantId(UUID tenantId);

    boolean existsByTenantId(UUID tenantId);
}
