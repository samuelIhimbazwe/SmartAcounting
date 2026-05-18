package com.smartaccounting.repository;

import com.smartaccounting.entity.PaymentRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRunRepository extends JpaRepository<PaymentRun, UUID> {
    Optional<PaymentRun> findByIdAndTenantId(UUID id, UUID tenantId);

    List<PaymentRun> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
