package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record MoveStockRequest(
    @NotNull UUID productId,
    @NotBlank String fromLocation,
    @NotBlank String toLocation,
    @NotNull BigDecimal quantity,
    @NotBlank String reason
) {
}
