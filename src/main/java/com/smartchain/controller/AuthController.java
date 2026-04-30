package com.smartchain.controller;

import com.smartchain.dto.AuthRequest;
import com.smartchain.dto.AuthResponse;
import com.smartchain.dto.MfaChallengeRequest;
import com.smartchain.dto.MfaChallengeResponse;
import com.smartchain.dto.RefreshRequest;
import com.smartchain.security.JwtService;
import com.smartchain.security.MfaService;
import com.smartchain.security.RefreshTokenService;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final MfaService mfaService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserDetailsService userDetailsService,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService,
                          MfaService mfaService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.mfaService = mfaService;
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody @Valid AuthRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        if (mfaService.requiresSecondFactor(userDetails)) {
            mfaService.assertValidOtp(
                request.username(),
                request.tenantId(),
                request.userId(),
                request.mfaChallengeId(),
                request.otpCode()
            );
        }
        String accessToken = jwtService.generateToken(userDetails, request.tenantId(), request.userId());
        String refreshToken = refreshTokenService.issue(request.tenantId(), request.userId(), userDetails);
        return new AuthResponse(accessToken, "Bearer", jwtService.expirationSeconds(), refreshToken);
    }

    @PostMapping("/mfa/challenge")
    public MfaChallengeResponse issueMfaChallenge(@RequestBody @Valid MfaChallengeRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );
        UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        if (!mfaService.requiresSecondFactor(userDetails)) {
            return new MfaChallengeResponse("not-required", 0, "none", null);
        }
        MfaService.Challenge challenge = mfaService.issueChallenge(request.username(), request.tenantId(), request.userId());
        return new MfaChallengeResponse(challenge.challengeId(), challenge.expiresInSeconds(), "email_otp", challenge.debugCode());
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody @Valid RefreshRequest request) {
        var consumed = refreshTokenService.consume(request.refreshToken());
        UserDetails userDetails = userDetailsService.loadUserByUsername(consumed.getUsername());
        String tenantId = consumed.getTenantId().toString();
        String userId = consumed.getUserId().toString();
        String accessToken = jwtService.generateToken(userDetails, tenantId, userId);
        String nextRefresh = refreshTokenService.issue(tenantId, userId, userDetails);
        return new AuthResponse(accessToken, "Bearer", jwtService.expirationSeconds(), nextRefresh);
    }

    @PostMapping("/logout")
    public void logout(@RequestBody @Valid RefreshRequest request) {
        refreshTokenService.revoke(request.refreshToken());
    }
}
