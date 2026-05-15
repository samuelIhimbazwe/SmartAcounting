package com.smartaccounting.repository;

import com.smartaccounting.entity.RraTaxFiling;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RraTaxFilingRepository extends JpaRepository<RraTaxFiling, UUID> {
    Optional<RraTaxFiling> findByTenantIdAndFilingTypeAndPeriod(UUID tenantId, String filingType, String period);
    List<RraTaxFiling> findByTenantIdAndPeriodOrderByFilingTypeAsc(UUID tenantId, String period);
}
