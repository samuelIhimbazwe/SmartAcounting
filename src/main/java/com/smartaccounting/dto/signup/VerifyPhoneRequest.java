package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.NotBlank;

public record VerifyPhoneRequest(
    @NotBlank String phone,
    @NotBlank String otp
) {
}
