package com.smartaccounting.repository;

import com.smartaccounting.entity.CustomerLoyaltyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CustomerLoyaltyTransactionRepository extends JpaRepository<CustomerLoyaltyTransaction, UUID> {
    List<CustomerLoyaltyTransaction> findByTenantIdAndCustomerIdOrderByCreatedAtDesc(
        UUID tenantId, UUID customerId);
}
