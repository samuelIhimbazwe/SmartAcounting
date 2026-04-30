package com.smartchain.dto;

public record AuthResponse(String token, String tokenType, long expiresInSeconds, String refreshToken) {
}
