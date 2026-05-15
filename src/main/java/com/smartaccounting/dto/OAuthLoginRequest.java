package com.smartaccounting.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthLoginRequest(
    @NotBlank String provider,
    @NotBlank String idToken
) {
}
