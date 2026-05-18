package com.smartaccounting.repository;
import com.smartaccounting.entity.SupplierBill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierBillRepository extends JpaRepository<SupplierBill, UUID> {
    List<SupplierBill> findByStatusAndDueDateBeforeAndDeletedAtIsNull(String status, LocalDate dueDate);
    List<SupplierBill> findAllByDeletedAtIsNull();
    java.util.Optional<SupplierBill> findByIdAndDeletedAtIsNull(UUID id);
    List<SupplierBill> findByTenantIdAndDeletedAtIsNullAndCreatedAtBetween(UUID tenantId, Instant from, Instant to);
    List<SupplierBill> findByTenantIdAndSupplierIdAndDeletedAtIsNullOrderByCreatedAtAsc(UUID tenantId, UUID supplierId);

    List<SupplierBill> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID tenantId);

    @Query("select count(b) from SupplierBill b where b.tenantId = :tenantId and b.deletedAt is null and upper(b.status) <> 'PAID' and b.dueDate < :dueBefore")
    long countOpenOverdueBefore(
        @Param("tenantId") UUID tenantId,
        @Param("dueBefore") LocalDate dueBefore
    );

    @Query("select count(b) from SupplierBill b where b.tenantId = :tenantId and b.deletedAt is null and upper(b.status) = upper(:status) and b.dueDate < :dueBefore")
    long countByTenantIdAndStatusAndDueDateBeforeAndDeletedAtIsNull(
        @Param("tenantId") UUID tenantId,
        @Param("status") String status,
        @Param("dueBefore") LocalDate dueBefore
    );

    @Query("""
        select b from SupplierBill b
        where b.tenantId = :tenantId and b.deletedAt is null
          and upper(b.status) = upper(:status)
          and b.dueDate >= :fromDate and b.dueDate <= :toDate
        order by b.dueDate asc
        """)
    List<SupplierBill> findByTenantIdAndStatusAndDueDateBetweenAndDeletedAtIsNull(
        @Param("tenantId") UUID tenantId,
        @Param("status") String status,
        @Param("fromDate") LocalDate fromDate,
        @Param("toDate") LocalDate toDate
    );
}
