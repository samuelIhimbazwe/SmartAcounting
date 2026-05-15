package com.smartaccounting.repository;

import com.smartaccounting.entity.PurchaseOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, UUID> {
    Optional<PurchaseOrder> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);
    Page<PurchaseOrder> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
    Page<PurchaseOrder> findByTenantIdAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(
        UUID tenantId, String status, Pageable pageable);
    long countByTenantIdAndDeletedAtIsNull(UUID tenantId);
}
