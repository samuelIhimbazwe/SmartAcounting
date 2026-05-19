package com.smartaccounting.repository;

import com.smartaccounting.entity.TaxConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaxConfigRepository extends JpaRepository<TaxConfig, UUID> {
    List<TaxConfig> findByTenantIdAndActiveTrueOrderByNameAsc(UUID tenantId);

    Optional<TaxConfig> findByIdAndTenantId(UUID id, UUID tenantId);
}
