package com.smartchain.dto;

public record MfaChallengeResponse(String challengeId, long expiresInSeconds, String delivery, String debugCode) {
}
