package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
public record LedgerFlowRequest(
    @NotBlank String description,
    @NotNull BigDecimal amount,
    @NotBlank String currencyCode
) {}
