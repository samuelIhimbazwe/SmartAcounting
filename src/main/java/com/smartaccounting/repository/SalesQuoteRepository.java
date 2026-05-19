package com.smartaccounting.repository;

import com.smartaccounting.entity.SalesQuote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SalesQuoteRepository extends JpaRepository<SalesQuote, UUID> {
    List<SalesQuote> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, String status);
    Optional<SalesQuote> findByIdAndTenantId(UUID id, UUID tenantId);
}
