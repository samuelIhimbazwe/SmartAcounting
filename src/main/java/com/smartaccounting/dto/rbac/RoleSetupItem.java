package com.smartaccounting.dto.rbac;

import java.util.List;

public record RoleSetupItem(
    String name,
    String description,
    String emoji,
    String colour,
    List<String> permissionCodes,
    boolean isOwner,
    RoleProfileConfig roleProfile
) {}
