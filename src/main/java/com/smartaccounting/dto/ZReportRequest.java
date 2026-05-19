package com.smartaccounting.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record ZReportRequest(
    @NotNull UUID tillSessionId,
    String reportType,
    BigDecimal closingCash,
    String cashierName
) {}
