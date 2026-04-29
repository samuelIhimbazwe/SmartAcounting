package com.smartchain.repository;

import com.smartchain.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    Optional<AuditLog> findTopByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
