package com.smartchain.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

@Configuration
public class AuthUsersConfig {

    @Bean
    UserDetailsService userDetailsService(PasswordEncoder passwordEncoder) {
        return new InMemoryUserDetailsManager(
            User.withUsername("ceo").password(passwordEncoder.encode("password")).roles("CEO").build(),
            User.withUsername("cfo").password(passwordEncoder.encode("password")).roles("CFO").build(),
            User.withUsername("sales").password(passwordEncoder.encode("password")).roles("SALES_MANAGER").build(),
            User.withUsername("ops").password(passwordEncoder.encode("password")).roles("OPS_MANAGER").build(),
            User.withUsername("hr").password(passwordEncoder.encode("password")).roles("HR_MANAGER").build(),
            User.withUsername("marketing").password(passwordEncoder.encode("password")).roles("MARKETING_MANAGER").build(),
            User.withUsername("accounting").password(passwordEncoder.encode("password")).roles("ACCOUNTING_CONTROLLER").build()
        );
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
