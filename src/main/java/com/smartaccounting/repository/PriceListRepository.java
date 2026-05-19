package com.smartaccounting.repository;

import com.smartaccounting.entity.PriceList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PriceListRepository extends JpaRepository<PriceList, UUID> {
    List<PriceList> findByTenantIdAndDeletedAtIsNullOrderByName(UUID tenantId);
    Optional<PriceList> findByIdAndTenantIdAndDeletedAtIsNull(UUID id, UUID tenantId);

    Optional<PriceList> findFirstByTenantIdAndLocationIdAndDeletedAtIsNull(
        UUID tenantId, UUID locationId);

    Optional<PriceList> findFirstByTenantIdAndLocationIdIsNullAndScopeAndDeletedAtIsNull(
        UUID tenantId, String scope);
}
