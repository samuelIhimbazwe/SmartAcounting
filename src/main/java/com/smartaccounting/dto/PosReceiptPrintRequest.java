package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PosReceiptPrintRequest(
    @NotNull UUID transactionId
) {}
