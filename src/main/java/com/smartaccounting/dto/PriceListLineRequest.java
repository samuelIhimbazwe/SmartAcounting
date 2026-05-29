package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record PriceListLineRequest(
    UUID lineId,
    @NotNull UUID productId,
    UUID variantId,
    @NotNull @Positive BigDecimal unitPrice
) {
}
