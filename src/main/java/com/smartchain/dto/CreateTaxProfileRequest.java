package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
public record CreateTaxProfileRequest(
    @NotBlank String countryCode,
    @NotBlank String taxCode,
    @NotNull BigDecimal rate
) {}
