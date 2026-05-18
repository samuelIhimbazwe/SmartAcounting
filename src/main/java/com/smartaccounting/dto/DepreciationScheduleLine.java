package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DepreciationScheduleLine(
    int periodNumber,
    LocalDate periodDate,
    BigDecimal depreciationAmount,
    BigDecimal accumulatedDepreciation,
    BigDecimal netBookValue
) {}
