package com.smartaccounting.dto.signup;

import jakarta.validation.constraints.NotBlank;

public record TenantUpdateStaffRoleRequest(
    @NotBlank String role
) {
}
