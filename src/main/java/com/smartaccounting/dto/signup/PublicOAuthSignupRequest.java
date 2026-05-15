package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.NotBlank;

public record PublicOAuthSignupRequest(
    @NotBlank String provider,
    @NotBlank String idToken,
    @NotBlank String businessName,
    @NotBlank String ownerName,
    @NotBlank String phone,
    @NotBlank String plan,
    String billingCycle
) {
}
