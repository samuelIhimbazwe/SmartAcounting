package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
public record CreateSalesOrderRequest(
    @NotBlank String customerName,
    @NotNull BigDecimal totalAmount,
    @NotBlank String currencyCode
) {}
