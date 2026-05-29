package com.smartaccounting.repository;

import com.smartaccounting.entity.StockTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockTransferRepository extends JpaRepository<StockTransfer, UUID> {
    Optional<StockTransfer> findByIdAndTenantId(UUID id, UUID tenantId);

    List<StockTransfer> findByTenantIdAndToLocationIdAndStatusOrderByCreatedAtDesc(
        UUID tenantId, UUID toLocationId, String status);

    List<StockTransfer> findByTenantIdAndFromLocationIdOrderByCreatedAtDesc(
        UUID tenantId, UUID fromLocationId);

    List<StockTransfer> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
