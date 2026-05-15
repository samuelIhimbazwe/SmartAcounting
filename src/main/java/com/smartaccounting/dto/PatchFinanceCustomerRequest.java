package com.smartaccounting.dto;

import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record PatchFinanceCustomerRequest(
    @DecimalMin(value = "0", inclusive = true) BigDecimal creditLimit
) {}
