package com.smartaccounting.service;

import com.smartaccounting.config.PublicSignupProperties;
import com.smartaccounting.config.SmsProperties;
import com.smartaccounting.dto.AuthResponse;
import com.smartaccounting.dto.AuthSessionProfile;
import com.smartaccounting.dto.signup.ForgotPasswordRequest;
import com.smartaccounting.dto.signup.PublicOAuthSignupRequest;
import com.smartaccounting.dto.signup.PublicSignupRequest;
import com.smartaccounting.dto.signup.ResetPasswordRequest;
import com.smartaccounting.dto.signup.ResendOtpResponse;
import com.smartaccounting.dto.signup.SignupResponse;
import com.smartaccounting.dto.signup.VerifyPhoneRequest;
import com.smartaccounting.exception.ConflictException;
import com.smartaccounting.security.JwtService;
import com.smartaccounting.security.RefreshTokenService;
import com.smartaccounting.signup.OidcIdentityTokenService;
import com.smartaccounting.signup.OidcVerifiedIdentity;
import com.smartaccounting.signup.PhoneMask;
import com.smartaccounting.signup.PhoneNormalizer;
import com.smartaccounting.sms.RwandaMobileNetwork;
import com.smartaccounting.sms.RwandaMobileNetworkDetector;
import com.smartaccounting.signup.PublicOtpService;
import com.smartaccounting.signup.PublicRateLimitService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
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
    private final SmsProperties smsProperties;
    private final PublicSignupProperties signupProperties;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserDetailsService userDetailsService;
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;
    private final OidcIdentityTokenService oidcIdentityTokenService;
    private final AuthSessionService authSessionService;

    public PublicSignupService(JdbcTemplate jdbcTemplate,
                               PasswordEncoder passwordEncoder,
                               PublicOtpService otpService,
                               PublicRateLimitService rateLimitService,
                               SmsDispatchService smsDispatchService,
                               SmsProperties smsProperties,
                               PublicSignupProperties signupProperties,
                               JwtService jwtService,
                               RefreshTokenService refreshTokenService,
                               UserDetailsService userDetailsService,
                               org.springframework.data.redis.core.StringRedisTemplate redisTemplate,
                               OidcIdentityTokenService oidcIdentityTokenService,
                               AuthSessionService authSessionService) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
        this.rateLimitService = rateLimitService;
        this.smsDispatchService = smsDispatchService;
        this.smsProperties = smsProperties;
        this.signupProperties = signupProperties;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.userDetailsService = userDetailsService;
        this.redisTemplate = redisTemplate;
        this.oidcIdentityTokenService = oidcIdentityTokenService;
        this.authSessionService = authSessionService;
    }

    @Transactional
    public SignupResponse signup(PublicSignupRequest req, String clientIp) {
        if (signupProperties.isRateLimitEnabled()
            && !rateLimitService.allow(
                "ratelimit:public:signup:ip:" + clientIp,
                signupProperties.getServiceMaxPerHour(),
                Duration.ofHours(1))) {
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
        Timestamp trialEnd = Timestamp.from(Instant.now().plus(30, ChronoUnit.DAYS));
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
            TenantContext.set(tenantId, userId);
            try {
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

            // RBAC roles are created during onboarding Q&A (POST /tenant/roles/setup), not at signup.
            // Staff invited to an existing tenant receive role assignments via AdminTenantUserService.invite().
            String otpCode = otpService.generateAndStore(OTP_SIGNUP, phone);
            String sessionToken = UUID.randomUUID().toString();
            storeSignupSession(sessionToken, tenantId, userId, email, req.businessName().trim());

            String welcome = "Welcome to SmartAccounting " + req.businessName().trim()
                + ". Login at " + signupProperties.getLoginUrlText()
                + " with " + email + ". Your 30-day free trial has started.";
            smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_WELCOME", java.util.List.of(phone), welcome);
            int otpSmsDelivered = dispatchSignupOtpSms(tenantId, phone, otpCode);

            String adminPhone = signupProperties.getPlatformAdminPhone();
            if (!adminPhone.isBlank()) {
                String alert = "New signup: " + req.businessName().trim()
                    + " owner " + req.ownerName().trim()
                    + " email " + email + " phone " + phone;
                smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_ALERT",
                    java.util.List.of(PhoneNormalizer.normalize(adminPhone)), alert);
            }

            return buildSignupResponse(tenantId, userId, sessionToken, phone, otpCode, otpSmsDelivered);
        } finally {
            TenantContext.clear();
        }
    }

    @Transactional
    public SignupResponse signupOAuth(PublicOAuthSignupRequest req, String clientIp) {
        if (signupProperties.isRateLimitEnabled()
            && !rateLimitService.allow(
                "ratelimit:public:signup:ip:" + clientIp,
                signupProperties.getServiceMaxPerHour(),
                Duration.ofHours(1))) {
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
        Timestamp trialEnd = Timestamp.from(Instant.now().plus(30, ChronoUnit.DAYS));
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
            TenantContext.set(tenantId, userId);
            try {
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

            // RBAC roles are created during onboarding Q&A (POST /tenant/roles/setup), not at signup.
            // Staff invited to an existing tenant receive role assignments via AdminTenantUserService.invite().
            String otpCode = otpService.generateAndStore(OTP_SIGNUP, phone);
            String sessionToken = UUID.randomUUID().toString();
            storeSignupSession(sessionToken, tenantId, userId, email, req.businessName().trim());

            String welcome = "Welcome to SmartAccounting " + req.businessName().trim()
                + ". Login at " + signupProperties.getLoginUrlText()
                + " with " + email + ". Your 30-day free trial has started.";
            smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_WELCOME", java.util.List.of(phone), welcome);
            int otpSmsDelivered = dispatchSignupOtpSms(tenantId, phone, otpCode);

            String adminPhone = signupProperties.getPlatformAdminPhone();
            if (!adminPhone.isBlank()) {
                String alert = "New signup (OAuth): " + req.businessName().trim()
                    + " owner " + ownerLabel
                    + " email " + email + " phone " + phone;
                smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_ALERT",
                    java.util.List.of(PhoneNormalizer.normalize(adminPhone)), alert);
            }

            return buildSignupResponse(tenantId, userId, sessionToken, phone, otpCode, otpSmsDelivered);
        } finally {
            TenantContext.clear();
        }
    }

    @Transactional
    public AuthResponse verifyPhone(VerifyPhoneRequest req) {
        String phone = PhoneNormalizer.normalize(req.phone());
        otpService.assertNotLocked(LOCK_SIGNUP, phone);
        if (!otpService.verifyAndConsume(OTP_SIGNUP, LOCK_SIGNUP, FAIL_SIGNUP, phone, req.otp())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        Map<String, Object> pending = jdbcTemplate.query(
            """
                select tenant_id, user_id, username
                from lookup_signup_pending_by_phone(?)
                """,
            rs -> {
                if (!rs.next()) {
                    return null;
                }
                return Map.<String, Object>of(
                    "tenant_id", UUID.fromString(rs.getString("tenant_id")),
                    "user_id", UUID.fromString(rs.getString("user_id")),
                    "username", rs.getString("username")
                );
            },
            phone
        );
        if (pending == null) {
            throw new IllegalArgumentException("Verification failed");
        }
        UUID tenantId = (UUID) pending.get("tenant_id");
        UUID userId = (UUID) pending.get("user_id");
        String username = pending.get("username").toString();

        TenantContext.set(tenantId, userId);
        try {
            jdbcTemplate.update("update tenants set phone_verified = true where id = ?", tenantId);
        } finally {
            TenantContext.clear();
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        AuthSessionProfile session = authSessionService.buildSession(tenantId, userId);
        String tid = tenantId.toString();
        String uid = userId.toString();
        String access = jwtService.generateToken(
            userDetails,
            tid,
            uid,
            authSessionService.loadEffectivePermissions(tenantId, userId, session.role())
        );
        String refresh = refreshTokenService.issue(tid, uid, userDetails);
        return AuthResponse.fromSession(access, "Bearer", jwtService.expirationSeconds(), refresh, session);
    }

    public ResendOtpResponse resendOtp(String phoneRaw) {
        String phone = PhoneNormalizer.normalize(phoneRaw);
        if (signupProperties.isRateLimitEnabled()
            && !rateLimitService.allow("ratelimit:public:resend:" + phone, 3, Duration.ofHours(1))) {
            throw new com.smartaccounting.exception.RateLimitExceededException("Too many resend attempts.");
        }
        Map<String, Object> pending = jdbcTemplate.query(
            """
                select tenant_id, user_id, username
                from lookup_signup_pending_by_phone(?)
                """,
            rs -> {
                if (!rs.next()) {
                    return null;
                }
                return Map.<String, Object>of(
                    "tenant_id", UUID.fromString(rs.getString("tenant_id")),
                    "user_id", UUID.fromString(rs.getString("user_id")),
                    "username", rs.getString("username")
                );
            },
            phone
        );
        if (pending == null) {
            throw new IllegalArgumentException("Cannot resend code");
        }
        String otpCode = otpService.generateAndStore(OTP_SIGNUP, phone);
        UUID tenantId = (UUID) pending.get("tenant_id");
        int delivered = dispatchSignupOtpSms(tenantId, phone, otpCode);
        return buildOtpDeliveryMeta(phone, otpCode, delivered);
    }

    private int dispatchSignupOtpSms(UUID tenantId, String phone, String otpCode) {
        String otpMsg = "Your SmartAccounting verification code is " + otpCode + ". Valid 10 minutes.";
        return smsDispatchService.send(tenantId, UUID.randomUUID(), "SIGNUP_OTP", java.util.List.of(phone), otpMsg);
    }

    private SignupResponse buildSignupResponse(
        UUID tenantId,
        UUID userId,
        String sessionToken,
        String phone,
        String otpCode,
        int smsDelivered
    ) {
        ResendOtpResponse meta = buildOtpDeliveryMeta(phone, otpCode, smsDelivered);
        return new SignupResponse(
            tenantId,
            userId,
            sessionToken,
            meta.maskedPhone(),
            meta.smsDelivery(),
            meta.smsCarrier(),
            meta.devOtp()
        );
    }

    private ResendOtpResponse buildOtpDeliveryMeta(String phone, String otpCode, int smsDelivered) {
        String delivery = resolveSmsDelivery(smsDelivered);
        String devOtp = null;
        if (signupProperties.isExposeOtpInResponse() && !"SENT".equals(delivery)) {
            devOtp = otpCode;
        }
        String carrier = carrierLabel(detectCarrier(phone));
        return new ResendOtpResponse(PhoneMask.mask(phone), delivery, carrier, devOtp);
    }

    private RwandaMobileNetwork detectCarrier(String phone) {
        return RwandaMobileNetworkDetector.detect(
            phone,
            smsProperties.resolvedMtnPrefixes(),
            smsProperties.resolvedAirtelPrefixes()
        );
    }

    private static String carrierLabel(RwandaMobileNetwork network) {
        return RwandaMobileNetworkDetector.networkLabel(network);
    }

    private String resolveSmsDelivery(int smsDelivered) {
        if (!smsProperties.isEnabled()) {
            return "DISABLED";
        }
        if (smsProperties.isDryRun() || !smsProperties.isLiveDispatchConfigured()) {
            return "DRY_RUN";
        }
        return smsDelivered > 0 ? "SENT" : "FAILED";
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
            """
                select tenant_id from lookup_password_reset_user_by_phone(?)
                """,
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
                "select lookup_password_reset_phone_by_email(?) as phone",
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
                select user_id, tenant_id
                from lookup_password_reset_user_by_phone(?)
                """,
            phone
        );
        UUID userId = UUID.fromString(row.get("user_id").toString());
        UUID tenantId = UUID.fromString(row.get("tenant_id").toString());
        String hash = passwordEncoder.encode(req.newPassword());
        TenantContext.set(tenantId, userId);
        try {
            jdbcTemplate.update("update users set password_hash = ? where id = ?", hash, userId);
            refreshTokenService.revokeAllForUser(tenantId, userId);
        } finally {
            TenantContext.clear();
        }
    }

    private void storeSignupSession(String sessionToken, UUID tenantId, UUID userId, String email, String businessName) {
        try {
            redisTemplate.opsForValue().set(
                SESSION_KEY + sessionToken,
                tenantId + "|" + userId + "|" + email + "|" + businessName,
                Duration.ofDays(7)
            );
        } catch (RuntimeException ignored) {
            // Signup OTP and verify flow do not require this session key; avoid failing signup when Redis is down.
        }
    }

    private boolean existsSignupEmail(String emailLower) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "select public_signup_email_taken(?)",
            Boolean.class,
            emailLower
        ));
    }

    private boolean existsOauthSubject(String provider, String subject) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "select public_signup_oauth_subject_taken(?, ?)",
            Boolean.class,
            provider,
            subject
        ));
    }

    private boolean existsPhone(String phone) {
        return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
            "select public_signup_phone_taken(?)",
            Boolean.class,
            phone
        ));
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
