package com.smartaccounting.oauth2;

import java.time.Instant;
import java.util.UUID;

public record SocialIdentityRecord(
    UUID id,
    UUID tenantId,
    UUID userId,
    String provider,
    String providerSubject,
    String email,
    String displayName,
    String avatarUrl,
    String accessToken,
    Instant lastLoginAt
) {
}
