package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateStockTransferRequest(
    @NotNull UUID toLocationId,
    @NotEmpty @Valid List<Line> lines
) {
    public record Line(
        @NotNull UUID productId,
        UUID variantId,
        @NotNull BigDecimal qty
    ) {}
}
