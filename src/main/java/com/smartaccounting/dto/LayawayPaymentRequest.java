package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record LayawayPaymentRequest(
    @NotNull @Positive BigDecimal amount,
    @Size(max = 30) String tenderType
) {}
