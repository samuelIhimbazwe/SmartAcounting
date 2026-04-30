package com.smartchain.repository;

import com.smartchain.entity.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, UUID> {
    Optional<IdempotencyRecord> findByTenantIdAndRouteKeyAndIdempotencyKey(UUID tenantId, String routeKey, String idempotencyKey);
}
