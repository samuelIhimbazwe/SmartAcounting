package com.smartaccounting.repository;

import com.smartaccounting.entity.FinanceCustomer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FinanceCustomerRepository extends JpaRepository<FinanceCustomer, UUID> {
    Optional<FinanceCustomer> findByIdAndTenantId(UUID id, UUID tenantId);
    Optional<FinanceCustomer> findFirstByTenantIdAndCustomerNameIgnoreCase(UUID tenantId, String customerName);
}
