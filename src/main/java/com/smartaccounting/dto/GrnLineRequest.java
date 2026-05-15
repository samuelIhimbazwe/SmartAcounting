package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record GrnLineRequest(
    UUID poLineId,
    @NotNull UUID productId,
    @NotBlank String sku,
    @NotBlank String productName,
    BigDecimal expectedQuantity,
    @NotNull BigDecimal receivedQuantity,
    @NotNull BigDecimal unitCost,
    String lotCode,
    LocalDate expiryDate,
    String location
) {}
