package com.smartaccounting.repository;

import com.smartaccounting.entity.PosReturn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PosReturnRepository extends JpaRepository<PosReturn, UUID> {
    Optional<PosReturn> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<PosReturn> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
    Page<PosReturn> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, String status, Pageable pageable);
    long countByTenantId(UUID tenantId);
}
