package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank String phone,
    @NotBlank String otp,
    @NotBlank @Size(min = 8, max = 128) String newPassword
) {
}
