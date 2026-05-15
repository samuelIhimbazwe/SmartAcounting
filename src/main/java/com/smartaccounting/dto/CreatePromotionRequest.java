package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CreatePromotionRequest(
    @NotBlank String name,
    String description,
    @NotBlank String promotionType,
    BigDecimal discountValue,
    BigDecimal bundlePrice,
    Integer buyQuantity,
    Integer getQuantity,
    String appliesTo,
    String category,
    @NotNull Instant startDate,
    @NotNull Instant endDate,
    BigDecimal minimumPurchase,
    BigDecimal maximumDiscount,
    Integer usageLimit,
    @Valid List<PromotionProductRequest> products
) {}
