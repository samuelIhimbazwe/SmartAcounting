package com.smartchain.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateTenantUserRoleRequest(@NotBlank String role) {
}
