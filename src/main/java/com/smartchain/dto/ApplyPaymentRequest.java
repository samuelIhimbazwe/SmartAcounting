package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;
public record ApplyPaymentRequest(
    @NotNull UUID paymentId,
    @NotBlank String targetType,
    @NotNull UUID targetId,
    @NotNull BigDecimal appliedAmount
) {}
