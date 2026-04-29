package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.Set;

public record CreateServiceAccountKeyRequest(
    @NotBlank String serviceAccountName,
    Set<String> scopes,
    Instant expiresAt
) {
}
