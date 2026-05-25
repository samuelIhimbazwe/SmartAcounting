package com.smartaccounting.dto;

import java.util.UUID;

public record UpdateTenantUserRoleRequest(
    String role,
    UUID roleId
) {
}
