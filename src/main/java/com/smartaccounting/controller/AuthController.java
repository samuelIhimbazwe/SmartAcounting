package com.smartaccounting.controller;

import com.smartaccounting.dto.AuthRequest;
import com.smartaccounting.dto.AuthResponse;
import com.smartaccounting.dto.AuthSessionProfile;
import com.smartaccounting.dto.MfaChallengeRequest;
import com.smartaccounting.dto.MfaChallengeResponse;
import com.smartaccounting.dto.OAuthAuthResponse;
import com.smartaccounting.dto.OAuthLoginRequest;
import com.smartaccounting.dto.RefreshRequest;
import com.smartaccounting.service.AuthSessionService;
import com.smartaccounting.service.OidcAuthService;
import com.smartaccounting.signup.DbUserLoginValidator;
import com.smartaccounting.signup.LoginIdentityService;
import com.smartaccounting.security.JwtRevocationService;
import com.smartaccounting.security.JwtService;
import com.smartaccounting.security.MfaService;
import com.smartaccounting.security.RefreshTokenService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final MfaService mfaService;
    private final DbUserLoginValidator dbUserLoginValidator;
    private final OidcAuthService oidcAuthService;
    private final LoginIdentityService loginIdentityService;
    private final JwtRevocationService jwtRevocationService;
    private final AuthSessionService authSessionService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserDetailsService userDetailsService,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService,
                          MfaService mfaService,
                          DbUserLoginValidator dbUserLoginValidator,
                          OidcAuthService oidcAuthService,
                          LoginIdentityService loginIdentityService,
                          JwtRevocationService jwtRevocationService,
                          AuthSessionService authSessionService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.mfaService = mfaService;
        this.dbUserLoginValidator = dbUserLoginValidator;
        this.oidcAuthService = oidcAuthService;
        this.loginIdentityService = loginIdentityService;
        this.jwtRevocationService = jwtRevocationService;
        this.authSessionService = authSessionService;
    }

    @GetMapping("/me")
    public AuthSessionProfile me() {
        UUID tenantId = TenantContext.tenantId();
        UUID userId = TenantContext.userId();
        if (tenantId == null || userId == null) {
            throw new IllegalStateException("Authenticated session required");
        }
        return authSessionService.buildSession(tenantId, userId);
    }

    @PostMapping("/oauth-login")
    public OAuthAuthResponse oauthLogin(@RequestBody @Valid OAuthLoginRequest request) {
        return oidcAuthService.login(request.provider(), request.idToken());
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody @Valid AuthRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        LoginIdentityService.LoginIdentity identity = loginIdentityService.resolve(
            request.username(), request.tenantId(), request.userId());
        String tenantId = identity.tenantId().toString();
        String userId = identity.userId().toString();
        TenantContext.set(identity.tenantId(), identity.userId());
        try {
            dbUserLoginValidator.validateTenantUserMatches(request.username(), tenantId, userId);

            UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
            if (mfaService.requiresSecondFactor(userDetails)) {
                mfaService.assertValidOtp(
                    request.username(),
                    tenantId,
                    userId,
                    request.mfaChallengeId(),
                    request.otpCode()
                );
            }
            AuthSessionProfile session = authSessionService.buildSession(identity.tenantId(), identity.userId());
            Set<String> permissions = authSessionService.loadEffectivePermissions(
                identity.tenantId(),
                identity.userId(),
                identity.role()
            );
            String accessToken = jwtService.generateToken(userDetails, tenantId, userId, permissions);
            String refreshToken = refreshTokenService.issue(tenantId, userId, userDetails);
            return AuthResponse.fromSession(
                accessToken,
                "Bearer",
                jwtService.expirationSeconds(),
                refreshToken,
                session
            );
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/mfa/challenge")
    public MfaChallengeResponse issueMfaChallenge(@RequestBody @Valid MfaChallengeRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        UUID tenantUuid = UUID.fromString(request.tenantId().trim());
        UUID userUuid = UUID.fromString(request.userId().trim());
        TenantContext.set(tenantUuid, userUuid);
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
            if (!mfaService.requiresSecondFactor(userDetails)) {
                return new MfaChallengeResponse("not-required", 0, "none", null);
            }
            MfaService.Challenge challenge = mfaService.issueChallenge(request.username(), request.tenantId(), request.userId());
            return new MfaChallengeResponse(challenge.challengeId(), challenge.expiresInSeconds(), "email_otp", challenge.debugCode());
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody @Valid RefreshRequest request) {
        var consumed = refreshTokenService.consume(request.refreshToken());
        TenantContext.set(consumed.getTenantId(), consumed.getUserId());
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(consumed.getUsername());
            String tenantId = consumed.getTenantId().toString();
            String userId = consumed.getUserId().toString();
            UUID tenantUuid = consumed.getTenantId();
            UUID userUuid = consumed.getUserId();
            AuthSessionProfile session = authSessionService.buildSession(tenantUuid, userUuid);
            Set<String> permissions = authSessionService.loadEffectivePermissions(
                tenantUuid,
                userUuid,
                null
            );
            String accessToken = jwtService.generateToken(userDetails, tenantId, userId, permissions);
            String nextRefresh = refreshTokenService.issue(tenantId, userId, userDetails);
            return AuthResponse.fromSession(
                accessToken,
                "Bearer",
                jwtService.expirationSeconds(),
                nextRefresh,
                session
            );
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/logout")
    public void logout(@RequestBody @Valid RefreshRequest request,
                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        revokeSession(request.refreshToken(), authorization);
    }

    @DeleteMapping("/logout")
    public void logoutDelete(@RequestBody(required = false) RefreshRequest request,
                             @RequestHeader(value = "Authorization", required = false) String authorization) {
        if (request != null && request.refreshToken() != null) {
            revokeSession(request.refreshToken(), authorization);
        } else if (authorization != null && authorization.startsWith("Bearer ")) {
            try {
                var claims = jwtService.parse(authorization.substring(7).trim());
                jwtRevocationService.revoke(claims.getId(), claims.getExpiration());
            } catch (RuntimeException ignored) {
                // access token already invalid
            }
        }
    }

    private void revokeSession(String refreshToken, String authorization) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.revoke(refreshToken);
        }
        if (authorization != null && authorization.startsWith("Bearer ")) {
            try {
                var claims = jwtService.parse(authorization.substring(7).trim());
                jwtRevocationService.revoke(claims.getId(), claims.getExpiration());
            } catch (RuntimeException ignored) {
                // access token already invalid
            }
        }
    }
}
