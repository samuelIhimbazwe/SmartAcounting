package com.smartaccounting.repository;

import com.smartaccounting.entity.MarketingCampaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MarketingCampaignRepository extends JpaRepository<MarketingCampaign, UUID> {
    Optional<MarketingCampaign> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<MarketingCampaign> findByTenantIdAndStatusOrderByCreatedAtDesc(UUID tenantId, String status, Pageable pageable);

    Page<MarketingCampaign> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
