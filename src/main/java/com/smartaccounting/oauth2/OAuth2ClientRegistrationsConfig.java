package com.smartaccounting.oauth2;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Registers Google / Microsoft OAuth2 clients when env credentials are present.
 * Redirect URI: {@code {baseUrl}/api/v1/auth/oauth2/callback/{registrationId}}
 */
@Configuration
public class OAuth2ClientRegistrationsConfig {

    @Bean
    ClientRegistrationRepository clientRegistrationRepository(
        @Value("${GOOGLE_CLIENT_ID:}") String googleClientId,
        @Value("${GOOGLE_CLIENT_SECRET:}") String googleClientSecret,
        @Value("${MICROSOFT_CLIENT_ID:}") String microsoftClientId,
        @Value("${MICROSOFT_CLIENT_SECRET:}") String microsoftClientSecret
    ) {
        List<ClientRegistration> registrations = new ArrayList<>();
        if (StringUtils.hasText(googleClientId) && StringUtils.hasText(googleClientSecret)) {
            registrations.add(googleRegistration(googleClientId, googleClientSecret));
        }
        if (StringUtils.hasText(microsoftClientId) && StringUtils.hasText(microsoftClientSecret)) {
            registrations.add(microsoftRegistration(microsoftClientId, microsoftClientSecret));
        }
        return new InMemoryClientRegistrationRepository(registrations);
    }

    private static ClientRegistration googleRegistration(String clientId, String clientSecret) {
        return ClientRegistration.withRegistrationId("google")
            .clientId(clientId)
            .clientSecret(clientSecret)
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/api/v1/auth/oauth2/callback/{registrationId}")
            .scope("openid", "email", "profile")
            .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
            .tokenUri("https://www.googleapis.com/oauth2/v4/token")
            .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
            .userNameAttributeName("sub")
            .clientName("Google")
            .build();
    }

    private static ClientRegistration microsoftRegistration(String clientId, String clientSecret) {
        return ClientRegistration.withRegistrationId("microsoft")
            .clientId(clientId)
            .clientSecret(clientSecret)
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/api/v1/auth/oauth2/callback/{registrationId}")
            .scope("openid", "email", "profile", "User.Read")
            .authorizationUri("https://login.microsoftonline.com/common/oauth2/v2.0/authorize")
            .tokenUri("https://login.microsoftonline.com/common/oauth2/v2.0/token")
            .jwkSetUri("https://login.microsoftonline.com/common/discovery/v2.0/keys")
            .userInfoUri("https://graph.microsoft.com/oidc/userinfo")
            .userNameAttributeName("email")
            .clientName("Microsoft")
            .build();
    }
}
