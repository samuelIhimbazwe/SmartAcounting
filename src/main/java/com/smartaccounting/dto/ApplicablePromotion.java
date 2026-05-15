package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ApplicablePromotion(
    UUID promotionId,
    String promotionName,
    String promotionType,
    BigDecimal discountAmount
) {}
