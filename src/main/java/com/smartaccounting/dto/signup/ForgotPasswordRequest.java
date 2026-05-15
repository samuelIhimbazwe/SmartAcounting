package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.AssertTrue;

public record ForgotPasswordRequest(String email, String phone) {
    @AssertTrue(message = "email or phone is required")
    public boolean hasIdentifier() {
        boolean e = email != null && !email.isBlank();
        boolean p = phone != null && !phone.isBlank();
        return e || p;
    }
}
