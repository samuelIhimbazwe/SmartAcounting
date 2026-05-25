package com.smartaccounting.dto.rbac;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record DesignRoleRequest(
    @NotBlank @Size(max = 2000) String prompt,
    UUID baseRoleId
) {
}
