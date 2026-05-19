package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoyaltyTransactionRequest(
    @NotBlank String transactionType,
    @NotNull Integer points,
    String notes
) {}
