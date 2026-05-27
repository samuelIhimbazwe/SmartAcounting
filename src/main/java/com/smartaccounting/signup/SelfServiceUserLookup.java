package com.smartaccounting.signup;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SelfServiceUserLookup {
    private final JdbcTemplate jdbcTemplate;

    public SelfServiceUserLookup(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean isSelfServiceOwner(String username) {
        if (username == null || username.isBlank()) {
            return false;
        }
        Boolean b = jdbcTemplate.query(
            """
                select u.self_service_owner
                from lookup_user_for_authentication(cast(? as text)) u
                """,
            rs -> rs.next() ? rs.getBoolean("self_service_owner") : null,
            username.trim()
        );
        return Boolean.TRUE.equals(b);
    }

    /** True when a {@code users} row exists with a stored password (exclude in-memory-only demo accounts). */
    public boolean hasPasswordBackedUser(String username) {
        if (username == null || username.isBlank()) {
            return false;
        }
        Boolean pwd = jdbcTemplate.query(
            """
                select case when u.password_hash is not null then true else false end as pwd
                from lookup_user_for_authentication(cast(? as text)) u
                """,
            rs -> {
                if (!rs.next()) {
                    return false;
                }
                return rs.getBoolean("pwd");
            },
            username.trim()
        );
        return Boolean.TRUE.equals(pwd);
    }
}
