package com.smartaccounting.repository;

import com.smartaccounting.entity.FxRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FxRateRepository extends JpaRepository<FxRate, UUID> {

    Optional<FxRate> findFirstByTenantIdAndBaseCurrencyAndQuoteCurrencyOrderByAsOfDateDescCreatedAtDesc(
        UUID tenantId,
        String baseCurrency,
        String quoteCurrency
    );
}
