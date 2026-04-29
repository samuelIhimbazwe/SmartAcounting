package com.smartchain.repository;

import com.smartchain.entity.SyncQueueItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SyncQueueRepository extends JpaRepository<SyncQueueItem, UUID> {
    List<SyncQueueItem> findTop50ByStatusOrderByLamportClockAsc(String status);
}
