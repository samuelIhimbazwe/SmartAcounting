package com.smartaccounting.dto;

public record BankReconciliationSummary(
    long totalLines,
    long matched,
    long unmatched,
    long suggested,
    double matchRate
) {}
