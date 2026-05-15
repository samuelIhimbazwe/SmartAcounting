package com.smartaccounting.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record InviteTenantUserRequest(
    @Email @NotBlank String email,
    @NotBlank String role
) {
}
