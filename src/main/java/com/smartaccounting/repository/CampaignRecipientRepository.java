package com.smartaccounting.repository;

import com.smartaccounting.entity.CampaignRecipient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CampaignRecipientRepository extends JpaRepository<CampaignRecipient, UUID> {
    List<CampaignRecipient> findByCampaignIdAndStatus(UUID campaignId, String status);

    List<CampaignRecipient> findByCampaignIdAndTenantId(UUID campaignId, UUID tenantId);
}
