package com.smartaccounting.config;

import com.smartaccounting.security.AuthRateLimitFilter;
import com.smartaccounting.security.ApiKeyAuthenticationFilter;
import com.smartaccounting.security.ApiVersionDeprecationFilter;
import com.smartaccounting.security.CorrelationIdFilter;
import com.smartaccounting.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            JwtAuthenticationFilter jwtAuthenticationFilter,
                                            CorrelationIdFilter correlationIdFilter,
                                            AuthRateLimitFilter authRateLimitFilter,
                                            ApiKeyAuthenticationFilter apiKeyAuthenticationFilter,
                                            ApiVersionDeprecationFilter apiVersionDeprecationFilter) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/v1/public/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/oauth-login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/mfa/challenge").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/refresh").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/integrations/mobile-money/mtn/callback").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/v1/integrations/mobile-money/mtn/callback").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/integrations/mobile-money/airtel/callback").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/v1/integrations/mobile-money/airtel/callback").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/ai/briefing/**").authenticated()
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(correlationIdFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(apiVersionDeprecationFilter, CorrelationIdFilter.class)
            .addFilterAfter(authRateLimitFilter, CorrelationIdFilter.class)
            .addFilterAfter(apiKeyAuthenticationFilter, AuthRateLimitFilter.class)
            .addFilterAfter(jwtAuthenticationFilter, AuthRateLimitFilter.class);
        return http.build();
    }

    /**
     * Explicit {@link DaoAuthenticationProvider} + {@link Primary} so {@link com.smartaccounting.controller.AuthController}
     * gets a stable manager (avoids mis-wired auto-config / StackOverflow on authenticate).
     */
    @Bean
    @Primary
    AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(passwordEncoder);
        provider.setUserDetailsService(userDetailsService);
        return new ProviderManager(provider);
    }
}
