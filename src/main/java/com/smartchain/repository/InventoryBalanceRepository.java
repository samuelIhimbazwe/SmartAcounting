package com.smartchain.repository;

import com.smartchain.entity.InventoryBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InventoryBalanceRepository extends JpaRepository<InventoryBalance, UUID> {
    Optional<InventoryBalance> findByTenantIdAndProductIdAndLocationCode(UUID tenantId, UUID productId, String locationCode);
}
