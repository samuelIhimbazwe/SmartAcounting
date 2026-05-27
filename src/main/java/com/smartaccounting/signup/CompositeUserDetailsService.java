package com.smartaccounting.signup;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

public class CompositeUserDetailsService implements UserDetailsService {
    private final UserDetailsService inMemoryUsers;
    private final PublicAuthSqlLookup authLookup;

    public CompositeUserDetailsService(UserDetailsService inMemoryUsers, PublicAuthSqlLookup authLookup) {
        this.inMemoryUsers = inMemoryUsers;
        this.authLookup = authLookup;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        try {
            return new DatabaseUserDetailsService(authLookup).loadUserByUsername(username);
        } catch (UsernameNotFoundException ignored) {
            return inMemoryUsers.loadUserByUsername(username);
        }
    }
}
