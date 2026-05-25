package com.smartaccounting.repository;

import com.smartaccounting.entity.PosPaymentTender;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PosPaymentTenderRepository extends JpaRepository<PosPaymentTender, UUID> {
    List<PosPaymentTender> findByTenantIdAndSalesOrderIdOrderByCreatedAtAsc(UUID tenantId, UUID salesOrderId);

    Optional<PosPaymentTender> findFirstByTenantIdAndTenderTypeInAndReferenceEqualsIgnoreCaseOrderByCreatedAtDesc(
        UUID tenantId, Collection<String> tenderTypes, String reference);

    @Query("""
        select coalesce(sum(t.amount), 0) from PosPaymentTender t
        inner join SalesOrder o on o.id = t.salesOrderId
        where t.tenantId = :tenantId and o.tenantId = :tenantId and o.salesChannel = 'POS'
          and t.tenderType = :tenderType and o.createdAt >= :start and o.createdAt < :end
          and o.posRegisterCode = :register
        """)
    BigDecimal sumTenderForRegisterDay(
        @Param("tenantId") UUID tenantId,
        @Param("tenderType") String tenderType,
        @Param("start") Instant start,
        @Param("end") Instant end,
        @Param("register") String register);
}
