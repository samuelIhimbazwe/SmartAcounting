package com.smartaccounting.repository;

import com.smartaccounting.entity.MobileMoneySettlementDedup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MobileMoneySettlementDedupRepository extends JpaRepository<MobileMoneySettlementDedup, UUID> {
    Optional<MobileMoneySettlementDedup> findByTenantIdAndProviderAndExternalId(UUID tenantId, String provider, String externalId);
}
