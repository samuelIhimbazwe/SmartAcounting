package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateLayawayRequest(
    @NotNull @Positive BigDecimal totalAmount,
    @NotNull @PositiveOrZero BigDecimal depositAmount,
    String currencyCode,
    @NotBlank String cartJson,
    LocalDate collectionDate
) {}
