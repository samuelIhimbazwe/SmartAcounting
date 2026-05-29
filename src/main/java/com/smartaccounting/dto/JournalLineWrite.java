package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record JournalLineWrite(
    @NotBlank String account,
    String description,
    BigDecimal debit,
    BigDecimal credit
) {}
