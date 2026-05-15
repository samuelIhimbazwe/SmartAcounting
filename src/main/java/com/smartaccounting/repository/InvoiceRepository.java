package com.smartaccounting.repository;
import com.smartaccounting.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByStatusAndDueDateBeforeAndDeletedAtIsNull(String status, LocalDate dueDate);
    List<Invoice> findAllByDeletedAtIsNull();
    List<Invoice> findByTenantIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID tenantId);
    List<Invoice> findByTenantIdAndStatusIgnoreCaseAndDeletedAtIsNullOrderByDueDateAsc(UUID tenantId, String status);
    java.util.Optional<Invoice> findByIdAndDeletedAtIsNull(UUID id);
    List<Invoice> findByTenantIdAndDeletedAtIsNullAndCreatedAtBetween(UUID tenantId, Instant from, Instant to);
    List<Invoice> findByTenantIdAndCustomerIdAndDeletedAtIsNullOrderByCreatedAtAsc(UUID tenantId, UUID customerId);
    List<Invoice> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    @Query("select count(i) from Invoice i where i.tenantId = :tenantId and upper(i.status) = upper(:status) and i.dueDate < :dueBefore and i.deletedAt is null")
    long countByTenantIdAndStatusAndDueDateBeforeAndDeletedAtIsNull(
        @Param("tenantId") UUID tenantId,
        @Param("status") String status,
        @Param("dueBefore") LocalDate dueBefore
    );

    @Query("select i from Invoice i where i.tenantId = :tenantId and upper(i.status) = upper(:status) and i.deletedAt is null and i.dueDate < :dueBefore order by i.amount desc")
    List<Invoice> findByTenantIdAndStatusAndDueDateBeforeAndDeletedAtIsNull(
        @Param("tenantId") UUID tenantId,
        @Param("status") String status,
        @Param("dueBefore") LocalDate dueBefore,
        Pageable pageable
    );
}
