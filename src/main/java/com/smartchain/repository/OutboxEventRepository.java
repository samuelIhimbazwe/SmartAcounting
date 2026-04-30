package com.smartchain.repository;

import com.smartchain.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
    List<OutboxEvent> findTop100ByStatusAndNextAttemptAtBeforeOrderByCreatedAtAsc(String status, Instant before);
    List<OutboxEvent> findTop100ByStatusAndNextAttemptAtIsNullOrderByCreatedAtAsc(String status);
}
