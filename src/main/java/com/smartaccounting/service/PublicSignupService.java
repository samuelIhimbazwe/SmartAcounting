package com.smartaccounting.service;

import com.smartaccounting.config.PublicSignupProperties;
import com.smartaccounting.dto.AuthResponse;
import com.smartaccounting.dto.signup.ForgotPasswordRequest;
import com.smartaccounting.dto.signup.PublicOAuthSignupRequest;
import com.smartaccounting.dto.signup.PublicSignupRequest;
import com.smartaccounting.dto.signup.ResetPasswordRequest;
import com.smartaccounting.dto.signup.SignupResponse;
import com.smartaccounting.dto.signup.VerifyPhoneRequest;
import com.smartaccounting.exception.ConflictException;
import com.smartaccounting.security.JwtService;
import com.smartaccounting.security.RefreshTokenService;
import com.smartaccounting.signup.OidcIdentityTokenService;
import com.smartaccounting.signup.OidcVerifiedIdentity;
import com.smartaccounting.signup.PhoneNormalizer;
import com.smartaccounting.signup.PublicOtpService;
import com.smartaccounting.signup.PublicRateLimitService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class PublicSignupService {
    private static final String OTP_SIGNUP = "public:otp:signup:";
    private static final String LOCK_SIGNUP = "public:lock:otp:signup:";
    private static final String FAIL_SIGNUP = "public:fail:otp:signup:";
    private static final String OTP_PWD = "public:otp:pwd:";
    private static final String LOCK_PWD = "public:lock:otp:pwd:";
    private static final String FAIL_PWD = "public:fail:otp:pwd:";
    private static final String SESSION_KEY = "public:signup:session:";

    /**
     * Plan tiers a public signup may select. All start their lifecycle on a
     * 30-day trial (status = 'TRIAL'); the plan column captures the tier the
     * tenant intends to convert to at the end of the trial.
     */
    private static final Set<String> SUPPORTED_PLANS = Set.of(
        "TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"
    );

    private static final Set<String> SUPPORTED_BILLING_CYCLES = Set.of("MONTHLY", "ANNUAL");

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final PublicOtpService otpService;
    private final PublicRateLimitService rateLimitService;
    private final SmsDispatchService smsDispatchService;
    private final PublicSignupProperties signupProperties;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserDetailsService userDetailsService;
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;
    private final OidcIdentityTokenService oidcIdentityTokenService;

    public PublicSignupService(JdbcTemplate jdbcTemplate,
                               PasswordEncoder passwordEncoder,
                               PublicOtpService otpService,
                               PublicRateLimitService rateLimitService,
                               SmsDispatchService smsDispatchService,
                               PublicSignupProperties signupProperties,
                               JwtService jwtService,
                               RefreshTokenService refreshTokenService,
                               UserDetailsService userDetailsService,
                               org.springframework.data.redis.core.StringRedisTemplate redisTemplate,
                               OidcIdentityTokenService oidcIdentityTokenService) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
        this.rateLimitService = rateLimitService;
        this.smsDispatchService = smsDispatchService;
        this.signupProperties = signupProperties;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.userDetailsService = userDetailsService;
        this.redisTemplate = redisTemplate;
        this.oidcIdentityTokenService = oidcIdentityTokenService;
    }

    @Transactional
    public SignupResponse signup(PublicSignupRequest req, String clientIp) {
        if (!rateLimitService.allow("ratelimit:public:signup:ip:" + clientIp, 5, Duration.ofHours(1))) {
            throw new com.smartaccounting.exception.RateLimitExceededException("Too many signup attempts.");
        }
        String email = normalizeEmail(req.email());
        String phone = PhoneNormalizer.normalize(req.phone());
        if (email.isEmpty() || phone.isEmpty()) {
            throw new IllegalArgumentException("Invalid email or phone");
        }
        String plan = req.plan() == null ? "TRIAL" : req.plan().trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_PLANS.contains(plan)) {
            throw new IllegalArgumentException("Invalid plan");
        }
        String billingCycle = req.billingCycle() == null || req.billingCycle().isBlank()
            ? "MONTHLY"
            : req.billingCycle().trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_BILLING_CYCLES.contains(billingCycle)) {
            throw new IllegalArgumentException("Invalid billing cycle");
        }
        if (existsSignupEmail(email) || existsPhone(phone)) {
            throw new ConflictException();
        }

        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Instant trialEnd = Instant.now().plus(30, ChronoUnit.DAYS);
        String hash = passwordEncoder.encode(req.password());

        try {
            jdbcTemplate.update(
                """
                    insert into tenants (id, name, status, created_at, trial_ends_at, plan, billing_cycle, phone_verified)
                    values (?, ?, 'TRIAL', now(), ?, ?, ?, false)
                    """,
                tenantId,
                req.businessName().trim(),
                trialEnd,
                plan,
                billingCycle
            );
            jdbcTemplate.update(
                """
                    insert into users (id, tenant_id, username, role, created_at, password_hash, phone, self_service_owner)
                    values (?, ?, ?, 'CEO', now(), ?, ?, true)
                    """,
                userId,
                tenantId,
                email,
                hash,
                phone
            );
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException();
        }

        String otpCode = otpService.generateAndStore(OTP_SIGNUP, phone);
        String sessionToken = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
            SESSION_KEY + sessionToken,
            tenantId + "|" + userId + "|" + email + "|" + req.businessName().trim(),
            Duration.ofDays(7)
        );

        String welcome = "Welcome to SmartAccounting " + req.businessName().trim()
            + ". Login at " + signupProperties.getLoginUrlText()
            + " with " + email + ". Your 30-day free trial has started.";
        smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_WELCOME", java.util.List.of(phone), welcome);
        String otpMsg = "Your SmartAccounting verification code is " + otpCode + ". Valid 10 minutes.";
        smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_OTP", java.util.List.of(phone), otpMsg);

        String adminPhone = signupProperties.getPlatformAdminPhone();
        if (!adminPhone.isBlank()) {
            String alert = "New signup: " + req.businessName().trim()
                + " owner " + req.ownerName().trim()
                + " email " + email + " phone " + phone;
            smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_ALERT",
                java.util.List.of(PhoneNormalizer.normalize(adminPhone)), alert);
        }

        return new SignupResponse(tenantId, userId, sessionToken);
    }

    @Transactional
    public SignupResponse signupOAuth(PublicOAuthSignupRequest req, String clientIp) {
        if (!rateLimitService.allow("ratelimit:public:signup:ip:" + clientIp, 5, Duration.ofHours(1))) {
            throw new com.smartaccounting.exception.RateLimitExceededException("Too many signup attempts.");
        }
        OidcVerifiedIdentity identity = oidcIdentityTokenService.verify(req.provider(), req.idToken());
        String email = normalizeEmail(identity.email());
        String phone = PhoneNormalizer.normalize(req.phone());
        if (email.isEmpty() || phone.isEmpty()) {
            throw new IllegalArgumentException("Invalid email or phone");
        }
        String plan = req.plan() == null ? "TRIAL" : req.plan().trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_PLANS.contains(plan)) {
            throw new IllegalArgumentException("Invalid plan");
        }
        String billingCycle = req.billingCycle() == null || req.billingCycle().isBlank()
            ? "MONTHLY"
            : req.billingCycle().trim().toUpperCase(Locale.ROOT);
        if (!SUPPORTED_BILLING_CYCLES.contains(billingCycle)) {
            throw new IllegalArgumentException("Invalid billing cycle");
        }
        if (existsSignupEmail(email) || existsPhone(phone) || existsOauthSubject(identity.provider(), identity.subject())) {
            throw new ConflictException();
        }

        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Instant trialEnd = Instant.now().plus(30, ChronoUnit.DAYS);
        String ownerLabel = req.ownerName().trim().isBlank() ? identity.displayName() : req.ownerName().trim();

        try {
            jdbcTemplate.update(
                """
                    insert into tenants (id, name, status, created_at, trial_ends_at, plan, billing_cycle, phone_verified)
                    values (?, ?, 'TRIAL', now(), ?, ?, ?, false)
                    """,
                tenantId,
                req.businessName().trim(),
                trialEnd,
                plan,
                billingCycle
            );
            jdbcTemplate.update(
                """
                    insert into users (id, tenant_id, username, role, created_at, password_hash, phone, self_service_owner, oauth_provider, oauth_subject)
                    values (?, ?, ?, 'CEO', now(), null, ?, true, ?, ?)
                    """,
                userId,
                tenantId,
                email,
                phone,
                identity.provider(),
                identity.subject()
            );
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException();
        }

        String otpCode = otpService.generateAndStore(OTP_SIGNUP, phone);
        String sessionToken = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
            SESSION_KEY + sessionToken,
            tenantId + "|" + userId + "|" + email + "|" + req.businessName().trim(),
            Duration.ofDays(7)
        );

        String welcome = "Welcome to SmartAccounting " + req.businessName().trim()
            + ". Login at " + signupProperties.getLoginUrlText()
            + " with " + email + ". Your 30-day free trial has started.";
        smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_WELCOME", java.util.List.of(phone), welcome);
        String otpMsg = "Your SmartAccounting verification code is " + otpCode + ". Valid 10 minutes.";
        smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_OTP", java.util.List.of(phone), otpMsg);

        String adminPhone = signupProperties.getPlatformAdminPhone();
        if (!adminPhone.isBlank()) {
            String alert = "New signup (OAuth): " + req.businessName().trim()
                + " owner " + ownerLabel
                + " email " + email + " phone " + phone;
            smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_ALERT",
                java.util.List.of(PhoneNormalizer.normalize(adminPhone)), alert);
        }

        return new SignupResponse(tenantId, userId, sessionToken);
    }

    @Transactional
    public AuthResponse verifyPhone(VerifyPhoneRequest req) {
        String phone = PhoneNormalizer.normalize(req.phone());
        otpService.assertNotLocked(LOCK_SIGNUP, phone);
        if (!otpService.verifyAndConsume(OTP_SIGNUP, LOCK_SIGNUP, FAIL_SIGNUP, phone, req.otp())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        UUID tenantId = jdbcTemplate.query(
            """
                select t.id from tenants t
                join users u on u.tenant_id = t.id
                where u.phone = ? and t.phone_verified = false
                limit 1
                """,
            rs -> rs.next() ? UUID.fromString(rs.getString("id")) : null,
            phone
        );
        if (tenantId == null) {
            throw new IllegalArgumentException("Verification failed");
        }
        jdbcTemplate.update("update tenants set phone_verified = true where id = ?", tenantId);

        Map<String, Object> row = jdbcTemplate.queryForMap(
            "select id, tenant_id, username from users where phone = ? and tenant_id = ? limit 1",
            phone, tenantId
        );
        UUID userId = UUID.fromString(row.get("id").toString());
        String username = row.get("username").toString();

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        String tid = tenantId.toString();
        String uid = userId.toString();
        String access = jwtService.generateToken(userDetails, tid, uid);
        String refresh = refreshTokenService.issue(tid, uid, userDetails);
        return new AuthResponse(access, "Bearer", jwtService.expirationSeconds(), refresh);
    }

    public void resendOtp(String phoneRaw) {
        String phone = PhoneNormalizer.normalize(phoneRaw);
        if (!rateLimitService.allow("ratelimit:public:resend:" + phone, 3, Duration.ofHours(1))) {
            throw new com.smartaccounting.exception.RateLimitExceededException("Too many resend attempts.");
        }
        Boolean pending = jdbcTemplate.query(
            """
                select count(*) > 0 from tenants t
                join users u on u.tenant_id = t.id
                where u.phone = ? and t.phone_verified = false
                """,
            rs -> {
                rs.next();
                return rs.getBoolean(1);
            },
            phone
        );
        if (!Boolean.TRUE.equals(pending)) {
            throw new IllegalArgumentException("Cannot resend code");
        }
        String otpCode = otpService.generateAndStore(OTP_SIGNUP, phone);
        smsDispatchService.send(
            jdbcTemplate.query(
                "select tenant_id from users where phone = ? limit 1",
                rs -> rs.next() ? UUID.fromString(rs.getString("tenant_id")) : UUID.randomUUID(),
                phone
            ),
            UUID.randomUUID(),
            "SIGNUP_OTP_RESEND",
            java.util.List.of(phone),
            "Your SmartAccounting verification code is " + otpCode + ". Valid 10 minutes."
        );
    }

    public void forgotPassword(ForgotPasswordRequest req, String clientIp) {
        if (!rateLimitService.allow("ratelimit:public:forgot:ip:" + clientIp, 10, Duration.ofHours(1))) {
            throw new com.smartaccounting.exception.RateLimitExceededException("Too many attempts.");
        }
        String phoneRaw = resolvePhoneForForgot(req);
        if (phoneRaw == null || phoneRaw.isBlank()) {
            return;
        }
        String phone = PhoneNormalizer.normalize(phoneRaw);
        UUID tenantId = jdbcTemplate.query(
            "select tenant_id from users where phone = ? and password_hash is not null limit 1",
            rs -> rs.next() ? UUID.fromString(rs.getString("tenant_id")) : null,
            phone
        );
        if (tenantId == null) {
            return;
        }
        String code = otpService.generateAndStore(OTP_PWD, phone);
        smsDispatchService.send(
            tenantId,
            UUID.randomUUID(),
            "PASSWORD_RESET",
            java.util.List.of(phone),
            "Your SmartAccounting password reset code is " + code + ". Valid 10 minutes."
        );
    }

    private String resolvePhoneForForgot(ForgotPasswordRequest req) {
        if (req.phone() != null && !req.phone().isBlank()) {
            return PhoneNormalizer.normalize(req.phone());
        }
        if (req.email() != null && !req.email().isBlank()) {
            String em = normalizeEmail(req.email());
            return jdbcTemplate.query(
                "select phone from users where lower(username) = ? and password_hash is not null limit 1",
                rs -> rs.next() ? rs.getString("phone") : null,
                em
            );
        }
        return null;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        String phone = PhoneNormalizer.normalize(req.phone());
        otpService.assertNotLocked(LOCK_PWD, phone);
        if (!otpService.verifyAndConsume(OTP_PWD, LOCK_PWD, FAIL_PWD, phone, req.otp())) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        Map<String, Object> row = jdbcTemplate.queryForMap(
            """
                select id, tenant_id from users
                where phone = ? and password_hash is not null
                limit 1
                """,
            phone
        );
        UUID userId = UUID.fromString(row.get("id").toString());
        UUID tenantId = UUID.fromString(row.get("tenant_id").toString());
        String hash = passwordEncoder.encode(req.newPassword());
        jdbcTemplate.update("update users set password_hash = ? where id = ?", hash, userId);
        refreshTokenService.revokeAllForUser(tenantId, userId);
    }

    private boolean existsSignupEmail(String emailLower) {
        Boolean ok = jdbcTemplate.query(
            """
                select count(*) > 0 from users
                where lower(username) = ? and (password_hash is not null or oauth_provider is not null)
                """,
            rs -> {
                rs.next();
                return rs.getBoolean(1);
            },
            emailLower
        );
        return Boolean.TRUE.equals(ok);
    }

    private boolean existsOauthSubject(String provider, String subject) {
        Boolean ok = jdbcTemplate.query(
            "select count(*) > 0 from users where oauth_provider = ? and oauth_subject = ?",
            rs -> {
                rs.next();
                return rs.getBoolean(1);
            },
            provider,
            subject
        );
        return Boolean.TRUE.equals(ok);
    }

    private boolean existsPhone(String phone) {
        Boolean ok = jdbcTemplate.query(
            "select count(*) > 0 from users where phone = ?",
            rs -> {
                rs.next();
                return rs.getBoolean(1);
            },
            phone
        );
        return Boolean.TRUE.equals(ok);
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
