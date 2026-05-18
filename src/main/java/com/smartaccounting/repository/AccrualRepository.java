package com.smartaccounting.repository;

import com.smartaccounting.entity.Accrual;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccrualRepository extends JpaRepository<Accrual, UUID> {
    Optional<Accrual> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Accrual> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    List<Accrual> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, String status);
}
