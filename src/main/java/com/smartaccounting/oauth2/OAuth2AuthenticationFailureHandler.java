package com.smartaccounting.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private final String redirectUri;

    public OAuth2AuthenticationFailureHandler(
        @Value("${smartaccounting.oauth2.redirect-uri:${SMARTACCOUNTING_OAUTH2_REDIRECT_URI:http://localhost:5173/auth/oauth2/callback}}") String redirectUri
    ) {
        this.redirectUri = redirectUri;
    }

    @Override
    public void onAuthenticationFailure(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException exception
    ) throws IOException {
        String message = exception.getMessage() != null
            ? exception.getMessage()
            : "OAuth2 authentication failed";
        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
            .queryParam("error", message)
            .build()
            .toUriString();
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
