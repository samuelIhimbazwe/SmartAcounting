package com.smartaccounting.dto.rbac;

import java.util.List;
import java.util.UUID;

public record RoleResponse(
    UUID id,
    String name,
    String description,
    String emoji,
    String colour,
    boolean isSystem,
    boolean isOwner,
    RoleProfileConfig roleProfile,
    List<PermissionResponse> permissions,
    long userCount
) {}
