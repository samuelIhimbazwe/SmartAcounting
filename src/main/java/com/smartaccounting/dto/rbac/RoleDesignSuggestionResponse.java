package com.smartaccounting.dto.rbac;

import java.util.List;
import java.util.UUID;

public record RoleDesignSuggestionResponse(
    String matchType,
    boolean fullySupported,
    String summary,
    String reasoning,
    RoleDraftSuggestion suggested,
    UUID basedOnRoleId,
    String basedOnRoleName,
    List<SimilarRoleHint> similarRoles,
    List<CustomPermissionProposal> customPermissions,
    List<String> unsupportedNotes,
    boolean aiEnhanced
) {
}
