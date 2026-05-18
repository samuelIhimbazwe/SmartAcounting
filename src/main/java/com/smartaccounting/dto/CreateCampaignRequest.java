package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.time.Instant;

public record CreateCampaignRequest(
    @NotBlank String name,
    @NotBlank String channel,
    @NotBlank String messageTemplate,
    String targetSegment,
    Instant scheduledAt,
    BigDecimal budget,
    Integer attributionWindowDays
) {}
