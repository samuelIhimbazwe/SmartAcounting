package com.smartaccounting.dto;

public record EbmComplianceReport(
    String period,
    long totalTransactions,
    long confirmedSubmissions,
    long failedSubmissions,
    long pendingSubmissions,
    double coverageRate,
    boolean isCompliant
) {}
