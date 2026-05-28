package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record LayawayPaymentRequest(
    @NotNull @Positive BigDecimal amount,
    String tenderType
) {}
