package com.smartaccounting.config;

import com.smartaccounting.signup.DatabaseUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Production authentication: database users only (no in-memory demo accounts).
 */
@Configuration
@Profile("prod")
public class ProdAuthUsersConfig {

    @Bean
    @Primary
    UserDetailsService userDetailsService(JdbcTemplate jdbcTemplate) {
        return new DatabaseUserDetailsService(jdbcTemplate);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
