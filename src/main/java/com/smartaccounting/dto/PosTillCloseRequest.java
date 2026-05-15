package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PosTillCloseRequest(
    @NotNull LocalDate businessDate,
    @NotBlank String posRegisterCode,
    @NotNull BigDecimal countedCash,
    @NotNull BigDecimal countedMomo,
    @NotNull BigDecimal countedAirtel,
    @NotNull BigDecimal countedCard,
    @NotNull BigDecimal countedOnAccount,
    String notes
) {}
