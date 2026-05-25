package com.smartaccounting.dto.rbac;

import java.util.List;

public record RoleDraftSuggestion(
    String name,
    String description,
    String emoji,
    String colour,
    List<String> permissionCodes,
    List<String> customPermissionCodes,
    RoleProfileConfig roleProfile
) {
    public RoleDraftSuggestion(
        String name,
        String description,
        String emoji,
        String colour,
        List<String> permissionCodes
    ) {
        this(name, description, emoji, colour, permissionCodes, List.of(), RoleProfileConfig.empty());
    }
}
