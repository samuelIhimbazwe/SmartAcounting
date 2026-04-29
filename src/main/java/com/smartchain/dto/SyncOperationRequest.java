package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;
import java.util.UUID;

public record SyncOperationRequest(
    @NotNull UUID deviceId,
    @NotBlank String operationType,
    @NotBlank String entityType,
    @NotNull Map<String, Object> payload,
    long lamportClock,
    String conflictPolicy
) {
}
