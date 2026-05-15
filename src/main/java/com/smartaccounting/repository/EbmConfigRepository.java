package com.smartaccounting.repository;

import com.smartaccounting.entity.EbmConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EbmConfigRepository extends JpaRepository<EbmConfig, UUID> {
    Optional<EbmConfig> findByTenantId(UUID tenantId);
}
