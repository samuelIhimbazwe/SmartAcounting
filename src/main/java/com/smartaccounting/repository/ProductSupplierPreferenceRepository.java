package com.smartaccounting.repository;

import com.smartaccounting.entity.ProductSupplierPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProductSupplierPreferenceRepository extends JpaRepository<ProductSupplierPreference, UUID> {
    Optional<ProductSupplierPreference> findFirstByTenantIdAndProductIdAndPreferredTrueOrderByCreatedAtDesc(
        UUID tenantId, UUID productId);
}
