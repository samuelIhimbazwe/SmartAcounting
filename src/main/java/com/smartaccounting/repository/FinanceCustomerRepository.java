package com.smartaccounting.repository;

import com.smartaccounting.entity.FinanceCustomer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceCustomerRepository extends JpaRepository<FinanceCustomer, UUID> {
    Optional<FinanceCustomer> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<FinanceCustomer> findFirstByTenantIdAndCustomerNameIgnoreCaseAndDeletedAtIsNull(
        UUID tenantId, String customerName);

    Optional<FinanceCustomer> findFirstByTenantIdAndTinNumberAndDeletedAtIsNull(
        UUID tenantId, String tinNumber);

    @Query("""
        SELECT c FROM FinanceCustomer c
        WHERE c.tenantId = :tenantId AND c.deletedAt IS NULL
        AND (
            lower(c.customerName) LIKE lower(concat('%', :q, '%'))
            OR c.phone LIKE concat('%', :q, '%')
            OR lower(c.email) LIKE lower(concat('%', :q, '%'))
        )
        ORDER BY c.customerName
        """)
    List<FinanceCustomer> search(@Param("tenantId") UUID tenantId, @Param("q") String q);
}
