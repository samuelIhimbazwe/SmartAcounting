package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.UUID;

public record SyncOperationRequest(
    @NotNull UUID deviceId,
    @NotBlank String idempotencyKey,
    @NotBlank String operationType,
    @NotBlank String entityType,
    @NotNull Map<String, Object> payload,
    long lamportClock,
    String conflictPolicy
) {
}
