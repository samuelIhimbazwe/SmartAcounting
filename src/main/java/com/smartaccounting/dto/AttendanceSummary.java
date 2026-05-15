package com.smartaccounting.dto;

public record AttendanceSummary(
    String period,
    long presentCount,
    long absentCount,
    long activeEmployees
) {}
