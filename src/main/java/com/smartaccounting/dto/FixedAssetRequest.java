package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FixedAssetRequest(
    String assetCode,
    @NotBlank String assetName,
    @NotBlank String category,
    String location,
    @NotNull LocalDate purchaseDate,
    @NotNull BigDecimal purchaseCost,
    @NotNull Integer usefulLifeMonths,
    BigDecimal salvageValue,
    String depreciationMethod,
    String currencyCode
) {}
