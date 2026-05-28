package com.smartaccounting.repository;

import com.smartaccounting.entity.LayawayOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LayawayOrderRepository extends JpaRepository<LayawayOrder, UUID> {
    List<LayawayOrder> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, String status);

    List<LayawayOrder> findByTenantIdAndCustomerIdOrderByCreatedAtDesc(UUID tenantId, UUID customerId);

    List<LayawayOrder> findByTenantIdAndCustomerIdAndStatusOrderByCreatedAtDesc(
        UUID tenantId, UUID customerId, String status);

    Optional<LayawayOrder> findByIdAndTenantId(UUID id, UUID tenantId);
}
