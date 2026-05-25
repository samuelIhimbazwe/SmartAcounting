package com.smartaccounting.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record InviteTenantUserRequest(
    @Email @NotBlank String email,
    String role,
    UUID roleId
) {
}
