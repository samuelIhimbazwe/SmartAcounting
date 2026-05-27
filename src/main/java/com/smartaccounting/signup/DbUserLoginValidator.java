package com.smartaccounting.signup;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.UUID;

@Component
public class DbUserLoginValidator {
    private final PublicAuthSqlLookup authLookup;

    public DbUserLoginValidator(PublicAuthSqlLookup authLookup) {
        this.authLookup = authLookup;
    }

    /**
     * Ensures JWT tenant/user claims match the password-backed user row (prevents cross-tenant token minting).
     */
    public void validateTenantUserMatches(String username, String tenantId, String userId) {
        if (username == null || tenantId == null || userId == null) {
            return;
        }
        String un = username.trim().toLowerCase(Locale.ROOT);
        if (!authLookup.isPasswordBacked(un)) {
            return;
        }
        UUID tid = parseUuid(tenantId);
        UUID uid = parseUuid(userId);
        boolean ok = authLookup.findLoginIdentity(un)
            .filter(row -> row.tenantId().equals(tid) && row.userId().equals(uid))
            .isPresent();
        if (!ok) {
            throw new IllegalArgumentException("Invalid credentials");
        }
    }

    private static UUID parseUuid(String s) {
        try {
            return UUID.fromString(s.trim());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid credentials");
        }
    }
}
