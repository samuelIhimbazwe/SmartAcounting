package com.smartaccounting.config;

import com.smartaccounting.signup.CompositeUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

@Configuration
@Profile("!prod")
public class AuthUsersConfig {

    /**
     * Single {@link UserDetailsService} bean so Spring Security wires {@link org.springframework.security.authentication.dao.DaoAuthenticationProvider}
     * correctly. In-memory users are composed internally (not exposed as their own bean).
     */
    @Bean
    @Primary
    UserDetailsService userDetailsService(PasswordEncoder passwordEncoder, JdbcTemplate jdbcTemplate) {
        UserDetailsService inMemoryUsers = new InMemoryUserDetailsManager(
            User.withUsername("ceo").password(passwordEncoder.encode("password")).roles("CEO").build(),
            User.withUsername("cfo").password(passwordEncoder.encode("password")).roles("CFO").build(),
            User.withUsername("sales").password(passwordEncoder.encode("password")).roles("SALES_MANAGER").build(),
            User.withUsername("ops").password(passwordEncoder.encode("password")).roles("OPS_MANAGER").build(),
            User.withUsername("hr").password(passwordEncoder.encode("password")).roles("HR_MANAGER").build(),
            User.withUsername("marketing").password(passwordEncoder.encode("password")).roles("MARKETING_MANAGER").build(),
            User.withUsername("accounting").password(passwordEncoder.encode("password")).roles("ACCOUNTING_CONTROLLER").build()
        );
        return new CompositeUserDetailsService(inMemoryUsers, jdbcTemplate);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
