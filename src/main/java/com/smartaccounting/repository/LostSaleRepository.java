package com.smartaccounting.repository;

import com.smartaccounting.entity.LostSale;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface LostSaleRepository extends JpaRepository<LostSale, UUID> {
    List<LostSale> findByTenantIdAndAttemptedAtBetween(UUID tenantId, Instant from, Instant to);
}
