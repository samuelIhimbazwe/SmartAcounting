package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
public record CreatePurchaseOrderRequest(
    @NotBlank String supplierName,
    @NotNull BigDecimal totalAmount,
    @NotBlank String currencyCode
) {}
