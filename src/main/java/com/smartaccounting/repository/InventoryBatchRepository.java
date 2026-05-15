package com.smartaccounting.repository;

import com.smartaccounting.entity.InventoryBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;
import java.util.UUID;

public interface InventoryBatchRepository extends JpaRepository<InventoryBatch, UUID> {
    Optional<InventoryBatch> findByTenantIdAndProductIdAndLocationCodeAndLotCode(UUID tenantId, UUID productId, String locationCode, String lotCode);
    List<InventoryBatch> findByTenantIdAndLocationCodeOrderByProductIdAscExpiryDateAscCreatedAtAsc(UUID tenantId, String locationCode);
    List<InventoryBatch> findByTenantIdAndProductIdAndLocationCodeOrderByExpiryDateAscCreatedAtAsc(UUID tenantId, UUID productId, String locationCode);
    Optional<InventoryBatch> findFirstByTenantIdAndProductIdAndExpiryDateIsNotNullOrderByExpiryDateAscCreatedAtAsc(UUID tenantId, UUID productId);
    List<InventoryBatch> findByTenantIdAndLocationCodeAndExpiryDateIsNotNullAndExpiryDateLessThanEqualOrderByExpiryDateAscCreatedAtAsc(
        UUID tenantId, String locationCode, LocalDate expiryDate);

    @Query("""
        select count(b) from InventoryBatch b
        where b.tenantId = :tenantId and b.locationCode = :locationCode
        and b.quantityOnHand > 0 and b.expiryDate is not null
        and b.expiryDate >= :fromDate and b.expiryDate <= :toDate
        """)
    long countExpiringBetween(
        @Param("tenantId") UUID tenantId,
        @Param("locationCode") String locationCode,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );
}
