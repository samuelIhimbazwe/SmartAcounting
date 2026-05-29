package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateStockTransferRequest(
    @NotNull UUID toLocationId,
    UUID fromLocationId,
    @NotEmpty @Valid List<Line> lines,
    Boolean requestOnly,
    String notes
) {
    public record Line(
        @NotNull UUID productId,
        UUID variantId,
        @NotNull BigDecimal qty
    ) {}
}
