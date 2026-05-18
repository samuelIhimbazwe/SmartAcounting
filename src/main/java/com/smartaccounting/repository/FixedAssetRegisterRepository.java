package com.smartaccounting.repository;

import com.smartaccounting.entity.FixedAssetRegister;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FixedAssetRegisterRepository extends JpaRepository<FixedAssetRegister, UUID> {
    Optional<FixedAssetRegister> findByIdAndTenantId(UUID id, UUID tenantId);

    List<FixedAssetRegister> findByTenantIdAndStatus(UUID tenantId, String status);

    Page<FixedAssetRegister> findByTenantIdAndStatus(UUID tenantId, String status, Pageable pageable);

    Page<FixedAssetRegister> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
