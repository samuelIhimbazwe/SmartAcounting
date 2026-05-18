package com.smartaccounting.repository;

import com.smartaccounting.entity.TillSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TillSessionRepository extends JpaRepository<TillSession, UUID> {
    Optional<TillSession> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<TillSession> findByTenantIdAndCashierIdAndStatus(UUID tenantId, UUID cashierId, String status);

    Optional<TillSession> findByTenantIdAndPosRegisterCodeAndStatus(
        UUID tenantId, String posRegisterCode, String status);
}
