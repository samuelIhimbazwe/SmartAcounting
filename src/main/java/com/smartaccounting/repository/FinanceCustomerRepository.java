package com.smartaccounting.repository;

import com.smartaccounting.entity.FinanceCustomer;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FinanceCustomerRepository extends JpaRepository<FinanceCustomer, UUID> {
    Optional<FinanceCustomer> findByIdAndTenantId(UUID id, UUID tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT c FROM FinanceCustomer c
        WHERE c.id = :id AND c.tenantId = :tenantId AND c.deletedAt IS NULL
        """)
    Optional<FinanceCustomer> findForUpdate(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    List<FinanceCustomer> findByTenantIdAndDeletedAtIsNullOrderByCustomerNameAsc(UUID tenantId);

    Optional<FinanceCustomer> findFirstByTenantIdAndPhoneAndDeletedAtIsNull(UUID tenantId, String phone);

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

    long countByTenantIdAndPriceListIdAndDeletedAtIsNull(UUID tenantId, UUID priceListId);

    List<FinanceCustomer> findByTenantIdAndPriceListIdAndDeletedAtIsNullOrderByCustomerNameAsc(
        UUID tenantId, UUID priceListId);
}
