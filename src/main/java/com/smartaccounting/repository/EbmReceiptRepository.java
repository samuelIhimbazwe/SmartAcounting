package com.smartaccounting.repository;

import com.smartaccounting.entity.EbmReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EbmReceiptRepository extends JpaRepository<EbmReceipt, UUID> {
    Optional<EbmReceipt> findByIdAndTenantId(UUID id, UUID tenantId);
    Page<EbmReceipt> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, String status, Pageable pageable);
    Page<EbmReceipt> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
    List<EbmReceipt> findByStatusAndRetryCountLessThan(String status, int retryCount);
    long countByTenantIdAndTransactionDateBetween(UUID tenantId, Instant from, Instant to);
    long countByTenantIdAndStatusAndTransactionDateBetween(
        UUID tenantId, String status, Instant from, Instant to);
}
