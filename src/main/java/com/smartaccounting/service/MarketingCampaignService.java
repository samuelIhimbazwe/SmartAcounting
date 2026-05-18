package com.smartaccounting.service;

import com.smartaccounting.dto.CampaignPerformance;
import com.smartaccounting.dto.CreateCampaignRequest;
import com.smartaccounting.dto.CustomerSegmentSummary;
import com.smartaccounting.entity.CampaignRecipient;
import com.smartaccounting.entity.CustomerSegment;
import com.smartaccounting.entity.MarketingCampaign;
import com.smartaccounting.repository.CampaignRecipientRepository;
import com.smartaccounting.repository.CustomerSegmentRepository;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.repository.MarketingCampaignRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class MarketingCampaignService {
    private static final List<String> SEGMENTS = List.of(
        "VIP", "REGULAR", "OCCASIONAL", "AT_RISK", "LAPSED", "NEW"
    );

    private final MarketingCampaignRepository campaignRepository;
    private final CampaignRecipientRepository recipientRepository;
    private final CustomerSegmentRepository customerSegmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final SmsDispatchService smsDispatchService;
    private final WhatsAppBroadcastService whatsAppBroadcastService;
    private final JdbcTemplate jdbcTemplate;

    public MarketingCampaignService(MarketingCampaignRepository campaignRepository,
                                    CampaignRecipientRepository recipientRepository,
                                    CustomerSegmentRepository customerSegmentRepository,
                                    InvoiceRepository invoiceRepository,
                                    SmsDispatchService smsDispatchService,
                                    WhatsAppBroadcastService whatsAppBroadcastService,
                                    JdbcTemplate jdbcTemplate) {
        this.campaignRepository = campaignRepository;
        this.recipientRepository = recipientRepository;
        this.customerSegmentRepository = customerSegmentRepository;
        this.invoiceRepository = invoiceRepository;
        this.smsDispatchService = smsDispatchService;
        this.whatsAppBroadcastService = whatsAppBroadcastService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public List<CustomerSegmentSummary> listSegmentSummaries() {
        UUID tenantId = requireTenant();
        return SEGMENTS.stream()
            .map(segment -> new CustomerSegmentSummary(
                segment,
                customerSegmentRepository.countByTenantIdAndSegment(tenantId, segment)))
            .toList();
    }

    @Transactional(readOnly = true)
    public Page<CustomerSegment> listCustomersBySegment(String segment, Pageable pageable) {
        return customerSegmentRepository.findByTenantIdAndSegment(requireTenant(), segment, pageable);
    }

    @Transactional
    public MarketingCampaign createCampaign(CreateCampaignRequest request, UUID createdBy) {
        UUID tenantId = requireTenant();
        List<CustomerSegment> recipients = request.targetSegment() != null && !request.targetSegment().isBlank()
            ? customerSegmentRepository.findByTenantIdAndSegment(tenantId, request.targetSegment())
            : customerSegmentRepository.findByTenantIdAndPhoneIsNotNull(tenantId);

        MarketingCampaign campaign = new MarketingCampaign();
        campaign.setId(UUID.randomUUID());
        campaign.setTenantId(tenantId);
        campaign.setName(request.name());
        campaign.setChannel(request.channel().toUpperCase());
        campaign.setMessageTemplate(request.messageTemplate());
        campaign.setTargetSegment(request.targetSegment());
        campaign.setStatus("DRAFT");
        campaign.setScheduledAt(request.scheduledAt());
        campaign.setBudget(request.budget());
        campaign.setRecipientCount(recipients.size());
        campaign.setDeliveredCount(0);
        campaign.setFailedCount(0);
        campaign.setAttributedRevenue(BigDecimal.ZERO);
        campaign.setAttributionWindowDays(
            request.attributionWindowDays() != null ? request.attributionWindowDays() : 7);
        campaign.setActualCost(BigDecimal.ZERO);
        campaign.setCreatedBy(createdBy);
        campaign.setCreatedAt(Instant.now());
        campaign = campaignRepository.save(campaign);

        String storeName = resolveTenantName(tenantId);
        for (CustomerSegment customer : recipients) {
            if (customer.getPhone() == null || customer.getPhone().isBlank()) {
                continue;
            }
            String message = personalise(request.messageTemplate(), customer, storeName);
            CampaignRecipient recipient = new CampaignRecipient();
            recipient.setId(UUID.randomUUID());
            recipient.setTenantId(tenantId);
            recipient.setCampaignId(campaign.getId());
            recipient.setCustomerName(customer.getCustomerName());
            recipient.setPhone(customer.getPhone());
            recipient.setPersonalisedMessage(message);
            recipient.setStatus("PENDING");
            recipient.setCreatedAt(Instant.now());
            recipientRepository.save(recipient);
        }

        return campaign;
    }

    @Async
    @Transactional
    public void sendCampaign(UUID tenantId, UUID campaignId) {
        try {
            TenantContext.set(tenantId, null);
            doSendCampaign(tenantId, campaignId);
        } finally {
            TenantContext.clear();
        }
    }

    private void doSendCampaign(UUID tenantId, UUID campaignId) {
        MarketingCampaign campaign = campaignRepository.findByIdAndTenantId(campaignId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));

        campaign.setStatus("RUNNING");
        campaign.setStartedAt(Instant.now());
        campaignRepository.save(campaign);

        List<CampaignRecipient> pending = recipientRepository.findByCampaignIdAndStatus(campaignId, "PENDING");
        int delivered = 0;
        int failed = 0;
        String channel = campaign.getChannel() == null ? "SMS" : campaign.getChannel().toUpperCase();

        for (CampaignRecipient recipient : pending) {
            try {
                boolean ok = dispatch(channel, tenantId, campaignId, recipient);
                if (ok) {
                    recipient.setStatus("DELIVERED");
                    recipient.setDeliveredAt(Instant.now());
                    delivered++;
                } else {
                    recipient.setStatus("FAILED");
                    recipient.setErrorMessage("Dispatch returned false");
                    failed++;
                }
            } catch (Exception ex) {
                recipient.setStatus("FAILED");
                recipient.setErrorMessage(ex.getMessage());
                failed++;
            }
            recipientRepository.save(recipient);
        }

        campaign.setStatus("COMPLETED");
        campaign.setCompletedAt(Instant.now());
        campaign.setDeliveredCount(delivered);
        campaign.setFailedCount(failed);
        campaignRepository.save(campaign);
    }

    private boolean dispatch(String channel, UUID tenantId, UUID campaignId, CampaignRecipient recipient) {
        String message = recipient.getPersonalisedMessage();
        String phone = recipient.getPhone();
        if ("WHATSAPP".equals(channel)) {
            return whatsAppBroadcastService.send(tenantId, "MARKETING_CAMPAIGN", phone, message);
        }
        int count = smsDispatchService.send(
            tenantId,
            campaignId,
            "MARKETING_CAMPAIGN",
            List.of(phone),
            message
        );
        return count > 0;
    }

    @Transactional
    public void calculateAttributedRevenue(UUID campaignId) {
        UUID tenantId = requireTenant();
        MarketingCampaign campaign = campaignRepository.findByIdAndTenantId(campaignId, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        if (!"COMPLETED".equals(campaign.getStatus()) || campaign.getCompletedAt() == null) {
            return;
        }

        List<String> recipientNames = recipientRepository.findByCampaignIdAndStatus(campaignId, "DELIVERED")
            .stream()
            .map(CampaignRecipient::getCustomerName)
            .toList();
        if (recipientNames.isEmpty()) {
            campaign.setAttributedRevenue(BigDecimal.ZERO);
            campaignRepository.save(campaign);
            return;
        }

        Instant windowStart = campaign.getCompletedAt();
        Instant windowEnd = campaign.getCompletedAt()
            .plus(campaign.getAttributionWindowDays() != null ? campaign.getAttributionWindowDays() : 7,
                ChronoUnit.DAYS);

        BigDecimal attributed = invoiceRepository.sumRevenueByCustomerNamesAndDateBetween(
            tenantId, recipientNames, windowStart, windowEnd);
        campaign.setAttributedRevenue(attributed);
        campaignRepository.save(campaign);
    }

    @Transactional(readOnly = true)
    public Page<MarketingCampaign> listCampaigns(String status, Pageable pageable) {
        UUID tenantId = requireTenant();
        if (status != null && !status.isBlank()) {
            return campaignRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(
                tenantId, status.toUpperCase(), pageable);
        }
        return campaignRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public CampaignPerformance getCampaignPerformance(UUID campaignId) {
        MarketingCampaign campaign = campaignRepository.findByIdAndTenantId(campaignId, requireTenant())
            .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        return new CampaignPerformance(
            campaign.getId(),
            campaign.getName(),
            campaign.getChannel(),
            campaign.getStatus(),
            campaign.getRecipientCount(),
            campaign.getDeliveredCount(),
            campaign.getFailedCount(),
            campaign.getAttributedRevenue(),
            campaign.getAttributionWindowDays(),
            campaign.getStartedAt(),
            campaign.getCompletedAt()
        );
    }

    private String personalise(String template, CustomerSegment customer, String storeName) {
        String balance = customer.getTotalSpend() != null
            ? formatAmount(customer.getTotalSpend()) : "0";
        return template
            .replace("{name}", customer.getCustomerName())
            .replace("{store}", storeName)
            .replace("{balance}", balance);
    }

    private String formatAmount(BigDecimal amount) {
        return NumberFormat.getNumberInstance(Locale.forLanguageTag("en-RW")).format(amount);
    }

    private String resolveTenantName(UUID tenantId) {
        try {
            return jdbcTemplate.queryForObject(
                "select coalesce(display_name, name) from tenants where id = ?::uuid",
                String.class,
                tenantId.toString()
            );
        } catch (Exception ex) {
            return "Store";
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
