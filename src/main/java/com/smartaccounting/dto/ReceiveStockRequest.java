package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ReceiveStockRequest(
    @NotNull UUID productId,
    @NotBlank String location,
    @NotNull BigDecimal quantity,
    @NotNull BigDecimal costPrice,
    @NotBlank String supplierRef,
    String lotCode,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate
) {}
