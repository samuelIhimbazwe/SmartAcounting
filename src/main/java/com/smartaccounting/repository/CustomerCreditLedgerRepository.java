package com.smartaccounting.repository;

import com.smartaccounting.entity.CustomerCreditLedger;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CustomerCreditLedgerRepository extends JpaRepository<CustomerCreditLedger, UUID> {
    List<CustomerCreditLedger> findByTenantIdAndCustomerIdOrderByCreatedAtDesc(UUID tenantId, UUID customerId);

    boolean existsByTenantIdAndCustomerIdAndSalesOrderIdAndEntryType(
        UUID tenantId, UUID customerId, UUID salesOrderId, String entryType);
}
