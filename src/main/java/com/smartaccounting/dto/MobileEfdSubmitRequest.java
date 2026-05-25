package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record MobileEfdSubmitRequest(
    @NotBlank String salesOrderId,
    @NotNull BigDecimal grossAmount,
    @NotNull BigDecimal vatAmount,
    String currencyCode
) {}
