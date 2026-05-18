package com.smartaccounting.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record OpenTillSessionRequest(
    @NotBlank String posRegisterCode,
    @NotNull @DecimalMin("0") BigDecimal openingFloat,
    UUID shiftId
) {}
