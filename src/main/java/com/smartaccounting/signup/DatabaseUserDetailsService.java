package com.smartaccounting.signup;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;

/**
 * Loads password-backed or OAuth-linked users from the {@code users} table (production auth).
 */
public class DatabaseUserDetailsService implements UserDetailsService {
    private final JdbcTemplate jdbcTemplate;

    public DatabaseUserDetailsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw new UsernameNotFoundException(username);
        }
        try {
            return jdbcTemplate.queryForObject(
                """
                    select username, password_hash, role
                    from lookup_user_for_authentication(?)
                    """,
                (rs, rowNum) -> mapRow(rs),
                normalized
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            throw new UsernameNotFoundException(username);
        }
    }

    private static UserDetails mapRow(ResultSet rs) throws SQLException {
        String uname = rs.getString("username");
        String hash = rs.getString("password_hash");
        if (hash == null || hash.isBlank()) {
            hash = "{noop}oauth";
        }
        String role = rs.getString("role");
        return User.builder()
            .username(uname)
            .password(hash)
            .authorities(DbUserRoleAuthorities.fromStoredRole(role))
            .build();
    }
}
