package com.smartaccounting.signup;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/**
 * Loads password-backed or OAuth-linked users from the {@code users} table (production auth).
 */
public class DatabaseUserDetailsService implements UserDetailsService {
    private final PublicAuthSqlLookup authLookup;

    public DatabaseUserDetailsService(PublicAuthSqlLookup authLookup) {
        this.authLookup = authLookup;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        PublicAuthSqlLookup.AuthUserRow row = authLookup.findUserForAuthentication(username)
            .orElseThrow(() -> new UsernameNotFoundException(username));
        String hash = row.passwordHash();
        if (hash == null || hash.isBlank()) {
            hash = "{noop}oauth";
        }
        return User.builder()
            .username(row.username())
            .password(hash)
            .authorities(DbUserRoleAuthorities.fromStoredRole(row.role()))
            .build();
    }
}
