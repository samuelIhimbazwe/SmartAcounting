package com.smartaccounting.dto;

public record AuthResponse(
    String token,
    String tokenType,
    long expiresInSeconds,
    String refreshToken,
    String role,
    String tenantId,
    String userId
) {
    public AuthResponse(String token, String tokenType, long expiresInSeconds, String refreshToken) {
        this(token, tokenType, expiresInSeconds, refreshToken, null, null, null);
    }
}
