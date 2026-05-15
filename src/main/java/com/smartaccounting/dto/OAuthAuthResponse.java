package com.smartaccounting.dto;

public record OAuthAuthResponse(
    String token,
    String tokenType,
    long expiresInSeconds,
    String refreshToken,
    String role,
    String tenantId,
    String userId
) {
}
