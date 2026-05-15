package com.smartaccounting.repository;

import com.smartaccounting.entity.RraEisSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RraEisSubmissionRepository extends JpaRepository<RraEisSubmission, UUID> {
    List<RraEisSubmission> findByTenantIdAndInvoiceIdOrderByCreatedAtDesc(UUID tenantId, UUID invoiceId);
}
