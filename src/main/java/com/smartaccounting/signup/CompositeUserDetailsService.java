package com.smartaccounting.signup;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;

public class CompositeUserDetailsService implements UserDetailsService {
    private final UserDetailsService inMemoryUsers;
    private final JdbcTemplate jdbcTemplate;

    public CompositeUserDetailsService(UserDetailsService inMemoryUsers, JdbcTemplate jdbcTemplate) {
        this.inMemoryUsers = inMemoryUsers;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        try {
            return inMemoryUsers.loadUserByUsername(username);
        } catch (UsernameNotFoundException ignored) {
            return loadFromDatabase(username);
        }
    }

    private UserDetails loadFromDatabase(String username) {
        String normalized = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw new UsernameNotFoundException(username);
        }
        try {
            return jdbcTemplate.queryForObject(
                """
                    select username, password_hash, role
                    from users
                    where lower(username) = ? and (password_hash is not null or oauth_provider is not null)
                    limit 1
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
