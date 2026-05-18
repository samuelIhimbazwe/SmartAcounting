package com.smartaccounting.oauth2;

import com.smartaccounting.security.JwtService;
import com.smartaccounting.security.RefreshTokenService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserDetailsService userDetailsService;
    private final String redirectUri;

    public OAuth2AuthenticationSuccessHandler(
        JwtService jwtService,
        RefreshTokenService refreshTokenService,
        UserDetailsService userDetailsService,
        @Value("${smartaccounting.oauth2.redirect-uri:${SMARTACCOUNTING_OAUTH2_REDIRECT_URI:http://localhost:5173/auth/oauth2/callback}}") String redirectUri
    ) {
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.userDetailsService = userDetailsService;
        this.redirectUri = redirectUri;
    }

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException {
        SmartChainOAuth2User principal = (SmartChainOAuth2User) authentication.getPrincipal();
        OAuth2AuthenticatedUser user = principal.getUser();
        String tenantId = user.tenantId().toString();
        String userId = user.id().toString();

        TenantContext.set(user.tenantId(), user.id());
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(user.username());
            String accessToken = jwtService.generateToken(userDetails, tenantId, userId);
            String refreshToken = refreshTokenService.issue(tenantId, userId, userDetails);

            String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshToken)
                .queryParam("expiresInSeconds", jwtService.expirationSeconds())
                .queryParam("tenantId", tenantId)
                .queryParam("userId", userId)
                .queryParam("role", user.role())
                .queryParam("provider", principal.getIdentity().provider().toLowerCase())
                .build()
                .toUriString();

            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        } finally {
            TenantContext.clear();
        }
    }
}
