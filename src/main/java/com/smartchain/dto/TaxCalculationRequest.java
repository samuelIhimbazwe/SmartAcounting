package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
public record TaxCalculationRequest(
    @NotBlank String countryCode,
    @NotBlank String taxCode,
    @NotNull BigDecimal amount
) {}
