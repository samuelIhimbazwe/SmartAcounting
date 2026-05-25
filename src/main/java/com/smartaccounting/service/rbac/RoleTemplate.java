package com.smartaccounting.service.rbac;

import java.util.List;

public record RoleTemplate(
    String name,
    String description,
    String emoji,
    String colour,
    List<String> alwaysPermissions,
    List<String> optionalPermissions,
    boolean isOwner,
    com.smartaccounting.dto.rbac.RoleProfileConfig roleProfile
) {}
