package com.smartaccounting.config;

import com.smartaccounting.oauth2.CookieOAuth2AuthorizationRequestRepository;
import com.smartaccounting.oauth2.OAuth2AuthenticationFailureHandler;
import com.smartaccounting.oauth2.OAuth2AuthenticationSuccessHandler;
import com.smartaccounting.oauth2.SmartChainOAuth2UserService;
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
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        JwtAuthenticationFilter jwtAuthenticationFilter,
        CorrelationIdFilter correlationIdFilter,
        AuthRateLimitFilter authRateLimitFilter,
        ApiKeyAuthenticationFilter apiKeyAuthenticationFilter,
        ApiVersionDeprecationFilter apiVersionDeprecationFilter,
        ClientRegistrationRepository clientRegistrationRepository,
        CookieOAuth2AuthorizationRequestRepository oauth2AuthorizationRequestRepository,
        OAuth2AuthenticationSuccessHandler oauth2SuccessHandler,
        OAuth2AuthenticationFailureHandler oauth2FailureHandler,
        SmartChainOAuth2UserService smartChainOAuth2UserService
    ) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/health/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/v1/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/ai/copilot/provider-status").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/oauth2/**").permitAll()
                .requestMatchers("/oauth2/**", "/api/v1/auth/oauth2/callback/**").permitAll()
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

        if (hasOAuth2Clients(clientRegistrationRepository)) {
            http.oauth2Login(oauth -> oauth
                .authorizationEndpoint(endpoint -> endpoint
                    .authorizationRequestRepository(oauth2AuthorizationRequestRepository))
                .redirectionEndpoint(endpoint -> endpoint
                    .baseUri("/api/v1/auth/oauth2/callback"))
                .userInfoEndpoint(user -> user.userService(smartChainOAuth2UserService))
                .successHandler(oauth2SuccessHandler)
                .failureHandler(oauth2FailureHandler)
            );
        }

        return http.build();
    }

    private static boolean hasOAuth2Clients(ClientRegistrationRepository repository) {
        for (String id : new String[] { "google", "microsoft" }) {
            ClientRegistration registration = repository.findByRegistrationId(id);
            if (registration != null) {
                return true;
            }
        }
        if (repository instanceof Iterable<?> iterable) {
            return iterable.iterator().hasNext();
        }
        return false;
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
