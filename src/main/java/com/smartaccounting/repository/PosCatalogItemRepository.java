package com.smartaccounting.repository;

import com.smartaccounting.entity.PosCatalogItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface PosCatalogItemRepository extends JpaRepository<PosCatalogItem, UUID> {
    Optional<PosCatalogItem> findByTenantIdAndBarcodeAndActiveTrue(UUID tenantId, String barcode);
    Optional<PosCatalogItem> findFirstByTenantIdAndProductIdAndActiveTrueOrderByCreatedAtDesc(UUID tenantId, UUID productId);
    List<PosCatalogItem> findByTenantIdAndProductIdAndActiveTrue(UUID tenantId, UUID productId);
}
