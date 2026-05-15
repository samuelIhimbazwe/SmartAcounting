package com.smartaccounting.repository;

import com.smartaccounting.entity.PosSaleLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PosSaleLineRepository extends JpaRepository<PosSaleLine, UUID> {
    List<PosSaleLine> findByTenantIdAndSalesOrderIdOrderByIdAsc(UUID tenantId, UUID salesOrderId);
}
