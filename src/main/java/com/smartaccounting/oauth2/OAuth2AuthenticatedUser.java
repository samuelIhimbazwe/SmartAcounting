package com.smartaccounting.oauth2;

import java.util.UUID;

public record OAuth2AuthenticatedUser(
    UUID id,
    UUID tenantId,
    String username,
    String role
) {
}
