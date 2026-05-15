package com.smartaccounting.repository;

import com.smartaccounting.entity.FinanceSupplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FinanceSupplierRepository extends JpaRepository<FinanceSupplier, UUID> {
    Optional<FinanceSupplier> findByIdAndTenantId(UUID id, UUID tenantId);
    Optional<FinanceSupplier> findFirstByTenantIdAndSupplierNameIgnoreCase(UUID tenantId, String supplierName);
}
