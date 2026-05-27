package com.smartaccounting.signup;

import org.springframework.stereotype.Service;

@Service
public class SelfServiceUserLookup {
    private final PublicAuthSqlLookup authLookup;

    public SelfServiceUserLookup(PublicAuthSqlLookup authLookup) {
        this.authLookup = authLookup;
    }

    public boolean isSelfServiceOwner(String username) {
        return authLookup.findUserForAuthentication(username)
            .map(PublicAuthSqlLookup.AuthUserRow::selfServiceOwner)
            .orElse(false);
    }

    /** True when a {@code users} row exists with a stored password (exclude in-memory-only demo accounts). */
    public boolean hasPasswordBackedUser(String username) {
        return authLookup.isPasswordBacked(username);
    }
}
