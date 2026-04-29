package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record MfaChallengeRequest(
    @NotBlank String username,
    @NotBlank String password,
    @NotBlank String tenantId,
    @NotBlank String userId
) {
}
