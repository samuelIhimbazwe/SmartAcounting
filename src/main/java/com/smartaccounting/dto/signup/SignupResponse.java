package com.smartaccounting.dto.signup;

import java.util.UUID;

public record SignupResponse(UUID tenantId, UUID userId, String token) {
}
