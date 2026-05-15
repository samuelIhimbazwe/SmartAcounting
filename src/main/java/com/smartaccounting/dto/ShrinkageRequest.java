package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ShrinkageRequest(
    @NotNull UUID productId,
    @NotBlank String sku,
    @NotBlank String productName,
    @NotNull BigDecimal quantity,
    @NotNull BigDecimal unitCost,
    @NotBlank String reason,
    String location,
    LocalDate incidentDate,
    String notes
) {}
