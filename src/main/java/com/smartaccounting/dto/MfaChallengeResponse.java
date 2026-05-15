package com.smartaccounting.dto;

public record MfaChallengeResponse(String challengeId, long expiresInSeconds, String delivery, String debugCode) {
}
