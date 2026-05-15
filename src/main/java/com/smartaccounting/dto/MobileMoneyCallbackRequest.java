package com.smartaccounting.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Canonical settlement payload for MTN MoMo / Airtel Money webhooks.
 * Map provider-specific field names at the edge (reverse proxy or adapter) into this shape.
 */
public record MobileMoneyCallbackRequest(
    @NotNull UUID tenantId,
    @NotBlank String transactionId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    @NotBlank String currencyCode,
    String phoneNumber
) {}
