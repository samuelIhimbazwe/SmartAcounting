package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
public record CreatePaymentRequest(
    @NotBlank String direction,
    @NotBlank String counterparty,
    @NotNull BigDecimal amount,
    @NotBlank String currencyCode
) {}
