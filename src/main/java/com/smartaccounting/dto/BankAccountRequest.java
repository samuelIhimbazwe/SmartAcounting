package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public record BankAccountRequest(
    @NotBlank String accountName,
    @NotBlank String accountNumber,
    @NotBlank String bankName,
    String currencyCode
) {}
