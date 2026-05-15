package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PromotionPerformanceReport(
    UUID promotionId,
    String promotionName,
    int usageCount,
    BigDecimal totalDiscountGiven,
    BigDecimal totalRevenueGenerated,
    BigDecimal averageDiscount
) {}
