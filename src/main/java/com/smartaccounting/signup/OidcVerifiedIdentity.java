package com.smartaccounting.signup;

public record OidcVerifiedIdentity(
    String provider,
    String subject,
    String email,
    String displayName
) {
}
