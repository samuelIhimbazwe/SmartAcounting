package com.smartaccounting.signup;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.UUID;

@Component
public class DbUserLoginValidator {
    private final JdbcTemplate jdbcTemplate;

    public DbUserLoginValidator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Ensures JWT tenant/user claims match the password-backed user row (prevents cross-tenant token minting).
     */
    public void validateTenantUserMatches(String username, String tenantId, String userId) {
        if (username == null || tenantId == null || userId == null) {
            return;
        }
        String un = username.trim().toLowerCase(Locale.ROOT);
        Boolean passwordBacked = jdbcTemplate.query(
            """
                select case when password_hash is not null then true else false end as pwd
                from users where lower(username) = ? limit 1
                """,
            rs -> {
                if (!rs.next()) {
                    return false;
                }
                return rs.getBoolean("pwd");
            },
            un
        );
        if (!Boolean.TRUE.equals(passwordBacked)) {
            return;
        }
        UUID tid = parseUuid(tenantId);
        UUID uid = parseUuid(userId);
        Boolean ok = jdbcTemplate.query(
            """
                select count(*) > 0 from users
                where lower(username) = ? and password_hash is not null and tenant_id = ? and id = ?
                """,
            rs -> {
                rs.next();
                return rs.getBoolean(1);
            },
            un, tid, uid
        );
        if (!Boolean.TRUE.equals(ok)) {
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
