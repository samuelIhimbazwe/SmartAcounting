package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record AuthRequest(
    @NotBlank String username,
    @NotBlank String password,
    @NotBlank String tenantId,
    @NotBlank String userId,
    String mfaChallengeId,
    String otpCode
) {
}
