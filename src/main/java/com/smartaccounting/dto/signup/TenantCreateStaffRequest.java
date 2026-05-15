package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TenantCreateStaffRequest(
    @Email @NotBlank String email,
    @NotBlank String role,
    @NotBlank @Size(min = 8, max = 128) String password
) {
}
