package com.smartaccounting.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PosTenderRequest(
    /** CASH | MOMO | AIRTEL_MONEY | CARD */
    @NotBlank String tenderType,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    /** Provider transaction id when tenderType is MOMO (MTN) or AIRTEL_MONEY */
    String reference
) {}
