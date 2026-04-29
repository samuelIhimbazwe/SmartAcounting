package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
public record CreateSupplierBillRequest(
    @NotBlank String supplierName,
    @NotNull BigDecimal amount,
    @NotBlank String currencyCode,
    @NotNull LocalDate dueDate
) {}
