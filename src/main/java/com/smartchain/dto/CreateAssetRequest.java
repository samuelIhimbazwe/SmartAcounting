package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateAssetRequest(
    @NotBlank String assetName,
    @NotBlank String category,
    @NotNull BigDecimal acquisitionCost,
    @NotNull LocalDate acquisitionDate,
    @NotNull Integer usefulLifeMonths,
    BigDecimal residualValue
) {
}
