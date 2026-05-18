package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CampaignPerformance(
    UUID campaignId,
    String name,
    String channel,
    String status,
    Integer recipientCount,
    Integer deliveredCount,
    Integer failedCount,
    BigDecimal attributedRevenue,
    Integer attributionWindowDays,
    Instant startedAt,
    Instant completedAt
) {}
