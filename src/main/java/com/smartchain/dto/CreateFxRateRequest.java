package com.smartchain.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
public record CreateFxRateRequest(
    @NotBlank String baseCurrency,
    @NotBlank String quoteCurrency,
    @NotNull BigDecimal rate,
    @NotBlank String source,
    @NotNull LocalDate asOfDate
) {}
