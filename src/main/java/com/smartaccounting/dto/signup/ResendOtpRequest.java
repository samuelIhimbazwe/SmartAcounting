package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.NotBlank;

public record ResendOtpRequest(
    @NotBlank String phone
) {
}
