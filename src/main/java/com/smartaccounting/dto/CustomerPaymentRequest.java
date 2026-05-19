package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record CustomerPaymentRequest(
    @NotNull @Positive BigDecimal amount,
    String reference,
    String notes
) {}
