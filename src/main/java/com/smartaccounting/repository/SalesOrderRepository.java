package com.smartaccounting.repository;

import com.smartaccounting.entity.SalesOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, UUID> {
    Optional<SalesOrder> findFirstByTenantIdAndCustomerNameIgnoreCaseOrderByCreatedAtDesc(
        UUID tenantId, String customerName);

    @Query("""
        SELECT o.customerName, max(o.createdAt) FROM SalesOrder o
        WHERE o.tenantId = :tenantId AND o.customerName IS NOT NULL
        GROUP BY o.customerName
        """)
    List<Object[]> lastPurchaseGroupedByCustomerName(@Param("tenantId") UUID tenantId);

    @Query("""
        SELECT DISTINCT o FROM SalesOrder o, PosPaymentTender t
        WHERE o.tenantId = :tenantId AND t.tenantId = :tenantId
        AND o.id = t.salesOrderId
        AND lower(o.customerName) = lower(:customerName)
        AND upper(t.tenderType) = 'ON_ACCOUNT'
        ORDER BY o.createdAt DESC
        """)
    List<SalesOrder> findOnAccountSalesForCustomer(
        @Param("tenantId") UUID tenantId, @Param("customerName") String customerName);

    @Query("""
        SELECT o FROM SalesOrder o
        WHERE o.tenantId = :tenantId AND lower(o.customerName) = lower(:customerName)
        ORDER BY o.createdAt DESC
        """)
    List<SalesOrder> findByTenantIdAndCustomerNameIgnoreCaseOrderByCreatedAtDesc(
        @Param("tenantId") UUID tenantId,
        @Param("customerName") String customerName,
        org.springframework.data.domain.Pageable pageable);
}
