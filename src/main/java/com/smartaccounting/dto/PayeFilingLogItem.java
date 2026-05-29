package com.smartaccounting.dto;

import java.time.Instant;
import java.util.UUID;

public record PayeFilingLogItem(
    UUID id,
    UUID payrollRunId,
    String period,
    String fileFormat,
    String status,
    Integer rowCount,
    Instant submittedAt,
    String referenceNumber,
    String errorMessage,
    Instant createdAt
) {}
