package com.smartaccounting.dto.rbac;

import java.util.List;

public record UpdateRoleRequest(
    String name,
    String description,
    String emoji,
    String colour,
    List<String> permissionCodes,
    RoleProfileConfig roleProfile
) {}
