package com.smartaccounting.repository;

import com.smartaccounting.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByTenantIdOrderByNameAsc(UUID tenantId);

    Optional<Product> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByTenantIdAndBarcode(UUID tenantId, String barcode);
}
