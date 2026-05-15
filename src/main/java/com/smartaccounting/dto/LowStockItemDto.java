package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record LowStockItemDto(
    UUID productId,
    String productName,
    int daysOfStockRemaining,
    BigDecimal suggestedOrderQuantity
) {}
