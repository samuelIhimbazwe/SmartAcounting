package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthRequest(
    @NotBlank String username,
    @NotBlank String password,
    /** Optional for self-service email login; required only for legacy demo header overrides. */
    String tenantId,
    String userId,
    String mfaChallengeId,
    String otpCode
) {
}
