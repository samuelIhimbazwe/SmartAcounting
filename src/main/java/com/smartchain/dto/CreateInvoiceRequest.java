package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
public record CreateInvoiceRequest(
    @NotBlank String customerName,
    @NotNull BigDecimal amount,
    @NotBlank String currencyCode,
    @NotNull LocalDate dueDate
) {}
