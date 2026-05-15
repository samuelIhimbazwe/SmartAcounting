package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PromotionCartItem(
    UUID productId,
    String sku,
    String category,
    BigDecimal lineTotal,
    BigDecimal quantity
) {}
