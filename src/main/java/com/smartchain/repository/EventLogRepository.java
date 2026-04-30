package com.smartchain.repository;

import com.smartchain.entity.EventLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EventLogRepository extends JpaRepository<EventLog, UUID> {
}
