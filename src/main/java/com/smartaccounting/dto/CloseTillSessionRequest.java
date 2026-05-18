package com.smartaccounting.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CloseTillSessionRequest(
    @NotNull @DecimalMin("0") BigDecimal closingCash,
    String notes
) {}
