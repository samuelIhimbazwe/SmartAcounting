package com.smartaccounting.repository;

import com.smartaccounting.entity.SyncQueueItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SyncQueueRepository extends JpaRepository<SyncQueueItem, UUID> {
    List<SyncQueueItem> findTop50ByStatusOrderByLamportClockAsc(String status);
    List<SyncQueueItem> findTop200ByTenantIdAndStatusOrderByLamportClockAsc(UUID tenantId, String status);
    boolean existsByTenantIdAndDeviceIdAndIdempotencyKey(UUID tenantId, UUID deviceId, String idempotencyKey);
}
