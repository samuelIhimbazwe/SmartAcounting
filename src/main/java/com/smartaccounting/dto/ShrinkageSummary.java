package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record ShrinkageSummary(
    LocalDate from,
    LocalDate to,
    BigDecimal totalCost,
    int recordCount,
    Map<String, BigDecimal> byReason
) {}
