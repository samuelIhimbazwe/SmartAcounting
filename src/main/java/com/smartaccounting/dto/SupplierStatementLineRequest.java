package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SupplierStatementLineRequest(
    @NotBlank String reference,
    @NotNull BigDecimal amount
) {
}
