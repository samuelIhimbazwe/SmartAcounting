package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ReceiveStockTransferRequest(
    @NotEmpty @Valid List<Line> lines
) {
    public record Line(
        UUID lineId,
        UUID productId,
        UUID variantId,
        BigDecimal qtyReceived
    ) {}
}
