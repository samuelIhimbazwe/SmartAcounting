package com.smartaccounting.repository;

import com.smartaccounting.entity.InventoryBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryBalanceRepository extends JpaRepository<InventoryBalance, UUID> {
    Optional<InventoryBalance> findByTenantIdAndProductIdAndLocationCode(UUID tenantId, UUID productId, String locationCode);

    List<InventoryBalance> findByTenantIdAndLocationCodeOrderByProductIdAsc(UUID tenantId, String locationCode);
}
