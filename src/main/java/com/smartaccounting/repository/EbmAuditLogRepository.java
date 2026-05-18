package com.smartaccounting.repository;

import com.smartaccounting.entity.EbmAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EbmAuditLogRepository extends JpaRepository<EbmAuditLog, UUID> {
    Page<EbmAuditLog> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
