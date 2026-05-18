package com.smartaccounting.oauth2;

import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class SmartChainOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {
    private final OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
    private final JdbcTemplate jdbcTemplate;
    private final SocialIdentityRepository socialIdentityRepository;

    public SmartChainOAuth2UserService(JdbcTemplate jdbcTemplate, SocialIdentityRepository socialIdentityRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.socialIdentityRepository = socialIdentityRepository;
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = delegate.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String provider = registrationId.toUpperCase(Locale.ROOT);
        return processOAuth2User(provider, oAuth2User, userRequest);
    }

    private OAuth2User processOAuth2User(String provider, OAuth2User oAuth2User, OAuth2UserRequest userRequest) {
        OAuth2UserInfo userInfo = OAuth2UserInfoFactory.getOAuth2UserInfo(provider, oAuth2User.getAttributes());
        if (userInfo.getEmail() == null || userInfo.getEmail().isBlank()) {
            throw new OAuth2AuthenticationException(
                "Email not provided by " + provider + ". Please ensure your account has a verified email.");
        }

        String email = userInfo.getEmail().trim().toLowerCase(Locale.ROOT);
        String subject = userInfo.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new OAuth2AuthenticationException("Provider subject missing for " + provider);
        }

        String accessTokenValue = userRequest.getAccessToken().getTokenValue();
        Instant now = Instant.now();

        Optional<SocialIdentityRecord> existingIdentity =
            socialIdentityRepository.findByProviderAndProviderSubject(provider, subject);

        OAuth2AuthenticatedUser user;
        SocialIdentityRecord identity;

        if (existingIdentity.isPresent()) {
            identity = existingIdentity.get();
            user = loadUserById(identity.userId())
                .orElseThrow(() -> new OAuth2AuthenticationException("User account not found"));
            identity = new SocialIdentityRecord(
                identity.id(),
                identity.tenantId(),
                identity.userId(),
                identity.provider(),
                identity.providerSubject(),
                identity.email(),
                identity.displayName(),
                identity.avatarUrl(),
                accessTokenValue,
                now
            );
            socialIdentityRepository.updateLogin(identity);
        } else {
            Optional<OAuth2AuthenticatedUser> existingUser = findUserByEmail(email);
            if (existingUser.isPresent()) {
                user = existingUser.get();
                linkExistingUser(user, provider, subject, userInfo);
            } else {
                user = createNewUserWithTenant(email, userInfo, provider, subject);
            }

            identity = new SocialIdentityRecord(
                UUID.randomUUID(),
                user.tenantId(),
                user.id(),
                provider,
                subject,
                email,
                userInfo.getName(),
                userInfo.getAvatarUrl(),
                accessTokenValue,
                now
            );
            socialIdentityRepository.insert(identity);
        }

        return new SmartChainOAuth2User(oAuth2User, user, identity);
    }

    private void linkExistingUser(
        OAuth2AuthenticatedUser user,
        String provider,
        String subject,
        OAuth2UserInfo userInfo
    ) {
        TenantContext.set(user.tenantId(), user.id());
        try {
            jdbcTemplate.update(
                """
                    update users
                    set auth_provider = 'MIXED',
                        email_verified = true,
                        avatar_url = coalesce(?, avatar_url),
                        oauth_provider = coalesce(oauth_provider, ?),
                        oauth_subject = coalesce(oauth_subject, ?)
                    where id = ?
                    """,
                userInfo.getAvatarUrl(),
                provider.toLowerCase(Locale.ROOT),
                subject,
                user.id()
            );
        } finally {
            TenantContext.clear();
        }
    }

    private OAuth2AuthenticatedUser createNewUserWithTenant(
        String email,
        OAuth2UserInfo userInfo,
        String provider,
        String subject
    ) {
        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Instant trialEnd = Instant.now().plus(30, ChronoUnit.DAYS);
        String businessName = (userInfo.getName() == null || userInfo.getName().isBlank())
            ? email
            : userInfo.getName().trim() + "'s Business";

        jdbcTemplate.update(
            """
                insert into tenants (id, name, status, created_at, trial_ends_at, plan, billing_cycle, phone_verified)
                values (?, ?, 'TRIAL', now(), ?, 'TRIAL', 'MONTHLY', true)
                """,
            tenantId,
            businessName,
            trialEnd
        );

        String oauthProviderKey = provider.toLowerCase(Locale.ROOT);
        jdbcTemplate.update(
            """
                insert into users (
                    id, tenant_id, username, role, created_at, password_hash,
                    oauth_provider, oauth_subject, avatar_url, email_verified, auth_provider, self_service_owner
                ) values (?, ?, ?, 'CEO', now(), null, ?, ?, ?, true, ?, true)
                """,
            userId,
            tenantId,
            email,
            oauthProviderKey,
            subject,
            userInfo.getAvatarUrl(),
            provider
        );

        return new OAuth2AuthenticatedUser(userId, tenantId, email, "CEO");
    }

    private Optional<OAuth2AuthenticatedUser> findUserByEmail(String email) {
        return jdbcTemplate.query(
            """
                select id, tenant_id, username, role
                from users
                where lower(username) = ?
                  and (password_hash is not null or oauth_provider is not null)
                limit 1
                """,
            rs -> rs.next()
                ? Optional.of(new OAuth2AuthenticatedUser(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("tenant_id")),
                rs.getString("username"),
                rs.getString("role")
            ))
                : Optional.empty(),
            email
        );
    }

    private Optional<OAuth2AuthenticatedUser> loadUserById(UUID userId) {
        return jdbcTemplate.query(
            "select id, tenant_id, username, role from users where id = ? limit 1",
            rs -> rs.next()
                ? Optional.of(new OAuth2AuthenticatedUser(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("tenant_id")),
                rs.getString("username"),
                rs.getString("role")
            ))
                : Optional.empty(),
            userId
        );
    }
}
