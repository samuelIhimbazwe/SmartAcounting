package com.smartaccounting.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record LoyaltyTransactionRequest(
    @NotBlank
    @Pattern(regexp = "ADJUST_ADD|ADJUST_SUB|EARN|REDEEM", message = "Invalid loyalty transaction type")
    String transactionType,
    @NotNull @Min(1) Integer points,
    String notes
) {}
