package com.smartaccounting.controller;

import com.smartaccounting.dto.AuthRequest;
import com.smartaccounting.dto.AuthResponse;
import com.smartaccounting.dto.MfaChallengeRequest;
import com.smartaccounting.dto.MfaChallengeResponse;
import com.smartaccounting.dto.OAuthAuthResponse;
import com.smartaccounting.dto.OAuthLoginRequest;
import com.smartaccounting.dto.RefreshRequest;
import com.smartaccounting.service.OidcAuthService;
import com.smartaccounting.signup.DbUserLoginValidator;
import com.smartaccounting.signup.LoginIdentityService;
import com.smartaccounting.security.JwtService;
import com.smartaccounting.security.MfaService;
import com.smartaccounting.security.RefreshTokenService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    public AuthController(AuthenticationManager authenticationManager,
                          UserDetailsService userDetailsService,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService,
                          MfaService mfaService,
                          DbUserLoginValidator dbUserLoginValidator,
                          OidcAuthService oidcAuthService,
                          LoginIdentityService loginIdentityService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.mfaService = mfaService;
        this.dbUserLoginValidator = dbUserLoginValidator;
        this.oidcAuthService = oidcAuthService;
        this.loginIdentityService = loginIdentityService;
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
            String accessToken = jwtService.generateToken(userDetails, tenantId, userId);
            String refreshToken = refreshTokenService.issue(tenantId, userId, userDetails);
            return new AuthResponse(
                accessToken,
                "Bearer",
                jwtService.expirationSeconds(),
                refreshToken,
                identity.role(),
                tenantId,
                userId
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
            String accessToken = jwtService.generateToken(userDetails, tenantId, userId);
            String nextRefresh = refreshTokenService.issue(tenantId, userId, userDetails);
            return new AuthResponse(accessToken, "Bearer", jwtService.expirationSeconds(), nextRefresh);
        } finally {
            TenantContext.clear();
        }
    }

    @PostMapping("/logout")
    public void logout(@RequestBody @Valid RefreshRequest request) {
        refreshTokenService.revoke(request.refreshToken());
    }
}
