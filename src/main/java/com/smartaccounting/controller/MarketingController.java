package com.smartaccounting.controller;

import com.smartaccounting.dto.CampaignPerformance;
import com.smartaccounting.dto.CreateCampaignRequest;
import com.smartaccounting.dto.CustomerSegmentSummary;
import com.smartaccounting.entity.CustomerSegment;
import com.smartaccounting.entity.MarketingCampaign;
import com.smartaccounting.service.MarketingCampaignService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/marketing")
public class MarketingController {
    private final MarketingCampaignService marketingCampaignService;

    public MarketingController(MarketingCampaignService marketingCampaignService) {
        this.marketingCampaignService = marketingCampaignService;
    }

    @GetMapping("/segments")
    @PreAuthorize(PermissionExpressions.MARKETING_ACCESS)
    public ResponseEntity<List<CustomerSegmentSummary>> getSegments() {
        return ResponseEntity.ok(marketingCampaignService.listSegmentSummaries());
    }

    @GetMapping("/segments/{segment}/customers")
    @PreAuthorize(PermissionExpressions.MARKETING_ACCESS)
    public ResponseEntity<Page<CustomerSegment>> getCustomersBySegment(
        @PathVariable String segment,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(marketingCampaignService.listCustomersBySegment(
            segment, PageRequest.of(page, size)));
    }

    @PostMapping("/campaigns")
    @PreAuthorize(PermissionExpressions.MARKETING_ACCESS)
    public ResponseEntity<MarketingCampaign> createCampaign(@RequestBody @Valid CreateCampaignRequest request) {
        UUID createdBy = TenantContext.userId() != null ? TenantContext.userId() : UUID.randomUUID();
        return ResponseEntity.ok(marketingCampaignService.createCampaign(request, createdBy));
    }

    @PostMapping("/campaigns/{campaignId}/send")
    @PreAuthorize(PermissionExpressions.MARKETING_ACCESS)
    public ResponseEntity<Void> sendCampaign(@PathVariable UUID campaignId) {
        marketingCampaignService.sendCampaign(TenantContext.tenantId(), campaignId);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/campaigns")
    @PreAuthorize(PermissionExpressions.MARKETING_ACCESS)
    public ResponseEntity<Page<MarketingCampaign>> listCampaigns(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(marketingCampaignService.listCampaigns(status, PageRequest.of(page, size)));
    }

    @GetMapping("/campaigns/{campaignId}/performance")
    @PreAuthorize(PermissionExpressions.MARKETING_ACCESS)
    public ResponseEntity<CampaignPerformance> getCampaignPerformance(@PathVariable UUID campaignId) {
        return ResponseEntity.ok(marketingCampaignService.getCampaignPerformance(campaignId));
    }

    @PostMapping("/campaigns/{campaignId}/calculate-attribution")
    @PreAuthorize(PermissionExpressions.MARKETING_ACCESS)
    public ResponseEntity<Void> calculateAttribution(@PathVariable UUID campaignId) {
        marketingCampaignService.calculateAttributedRevenue(campaignId);
        return ResponseEntity.ok().build();
    }
}
