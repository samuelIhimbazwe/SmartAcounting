package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreatePaymentRunRequest(
    @NotNull LocalDate fromDate,
    @NotNull LocalDate toDate,
    String billStatus,
    String notes,
    String currencyCode
) {}
