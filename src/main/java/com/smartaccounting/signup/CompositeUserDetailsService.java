package com.smartaccounting.signup;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

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
            return new DatabaseUserDetailsService(jdbcTemplate).loadUserByUsername(username);
        } catch (UsernameNotFoundException ignored) {
            return inMemoryUsers.loadUserByUsername(username);
        }
    }
}
