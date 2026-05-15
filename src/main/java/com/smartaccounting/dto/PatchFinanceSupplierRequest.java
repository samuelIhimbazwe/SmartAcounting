package com.smartaccounting.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record PatchFinanceSupplierRequest(
    @DecimalMin(value = "0", inclusive = true) BigDecimal creditLimit,
    @Min(0) @Max(3650) Integer paymentTermsDays
) {}
