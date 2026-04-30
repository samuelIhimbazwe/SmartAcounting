package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateJournalEntryRequest(
    @NotNull LocalDate entryDate,
    @NotBlank String description,
    @NotBlank String debitAccount,
    @NotBlank String creditAccount,
    @NotNull BigDecimal amount,
    @NotBlank String currencyCode
) {
}
