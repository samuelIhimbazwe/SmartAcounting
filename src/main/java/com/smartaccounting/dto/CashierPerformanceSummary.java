package com.smartaccounting.dto;

import java.math.BigDecimal;

public record CashierPerformanceSummary(
    String cashierId,
    String cashierName,
    long transactionCount,
    BigDecimal totalSales,
    long totalRefunds,
    BigDecimal refundAmount
) {}
