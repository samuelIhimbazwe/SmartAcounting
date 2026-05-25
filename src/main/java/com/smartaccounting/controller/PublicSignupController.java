package com.smartaccounting.controller;

import com.smartaccounting.dto.AuthResponse;
import com.smartaccounting.dto.signup.ForgotPasswordRequest;
import com.smartaccounting.dto.signup.PublicOAuthSignupRequest;
import com.smartaccounting.dto.signup.PublicSignupRequest;
import com.smartaccounting.dto.signup.ResendOtpRequest;
import com.smartaccounting.dto.signup.ResendOtpResponse;
import com.smartaccounting.dto.signup.ResetPasswordRequest;
import com.smartaccounting.dto.signup.SignupResponse;
import com.smartaccounting.dto.signup.VerifyPhoneRequest;
import com.smartaccounting.service.PublicSignupService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public")
public class PublicSignupController {

    private final PublicSignupService publicSignupService;

    public PublicSignupController(PublicSignupService publicSignupService) {
        this.publicSignupService = publicSignupService;
    }

    @PostMapping("/signup/oauth")
    public SignupResponse signupOAuth(@RequestBody @Valid PublicOAuthSignupRequest request, HttpServletRequest httpRequest) {
        return publicSignupService.signupOAuth(request, clientIp(httpRequest));
    }

    @PostMapping("/signup")
    public SignupResponse signup(@RequestBody @Valid PublicSignupRequest request, HttpServletRequest httpRequest) {
        return publicSignupService.signup(request, clientIp(httpRequest));
    }

    @PostMapping("/verify-phone")
    public AuthResponse verifyPhone(@RequestBody @Valid VerifyPhoneRequest request) {
        return publicSignupService.verifyPhone(request);
    }

    @PostMapping("/resend-otp")
    public ResendOtpResponse resendOtp(@RequestBody @Valid ResendOtpRequest request) {
        return publicSignupService.resendOtp(request.phone());
    }

    @PostMapping("/forgot-password")
    public void forgotPassword(@RequestBody @Valid ForgotPasswordRequest request, HttpServletRequest httpRequest) {
        publicSignupService.forgotPassword(request, clientIp(httpRequest));
    }

    @PostMapping("/reset-password")
    public void resetPassword(@RequestBody @Valid ResetPasswordRequest request) {
        publicSignupService.resetPassword(request);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
