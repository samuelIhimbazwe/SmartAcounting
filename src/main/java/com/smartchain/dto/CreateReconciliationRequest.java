package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
public record CreateReconciliationRequest(
    @NotBlank String accountCode,
    @NotBlank String period,
    @NotNull BigDecimal varianceAmount
) {}
