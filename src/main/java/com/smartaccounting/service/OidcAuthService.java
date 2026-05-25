package com.smartaccounting.service;

import com.smartaccounting.dto.AuthSessionProfile;
import com.smartaccounting.dto.OAuthAuthResponse;
import com.smartaccounting.security.JwtService;
import com.smartaccounting.security.RefreshTokenService;
import com.smartaccounting.signup.OidcIdentityTokenService;
import com.smartaccounting.signup.OidcVerifiedIdentity;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class OidcAuthService {
    private final OidcIdentityTokenService oidcIdentityTokenService;
    private final JdbcTemplate jdbcTemplate;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final UserDetailsService userDetailsService;
    private final AuthSessionService authSessionService;

    public OidcAuthService(OidcIdentityTokenService oidcIdentityTokenService,
                           JdbcTemplate jdbcTemplate,
                           JwtService jwtService,
                           RefreshTokenService refreshTokenService,
                           UserDetailsService userDetailsService,
                           AuthSessionService authSessionService) {
        this.oidcIdentityTokenService = oidcIdentityTokenService;
        this.jdbcTemplate = jdbcTemplate;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.userDetailsService = userDetailsService;
        this.authSessionService = authSessionService;
    }

    @Transactional(readOnly = true)
    public OAuthAuthResponse login(String provider, String idToken) {
        OidcVerifiedIdentity identity = oidcIdentityTokenService.verify(provider, idToken);
        Map<String, Object> row = jdbcTemplate.query(
            """
                select u.id as user_id, u.tenant_id, u.username, u.role, t.phone_verified
                from users u
                join tenants t on t.id = u.tenant_id
                where u.oauth_provider = ? and u.oauth_subject = ?
                limit 1
                """,
            rs -> {
                if (!rs.next()) {
                    return null;
                }
                return Map.of(
                    "user_id", UUID.fromString(rs.getString("user_id")),
                    "tenant_id", UUID.fromString(rs.getString("tenant_id")),
                    "username", rs.getString("username"),
                    "role", rs.getString("role"),
                    "phone_verified", rs.getBoolean("phone_verified")
                );
            },
            identity.provider(),
            identity.subject()
        );
        if (row == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "No workspace is linked to this account.");
        }
        if (!Boolean.TRUE.equals(row.get("phone_verified"))) {
            throw new ResponseStatusException(FORBIDDEN, "Verify your phone before signing in.");
        }
        UUID tenantId = (UUID) row.get("tenant_id");
        UUID userId = (UUID) row.get("user_id");
        String username = row.get("username").toString();
        String role = row.get("role").toString();

        TenantContext.set(tenantId, userId);
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            AuthSessionProfile session = authSessionService.buildSession(tenantId, userId);
            String tid = tenantId.toString();
            String uid = userId.toString();
            String access = jwtService.generateToken(
                userDetails,
                tid,
                uid,
                authSessionService.loadEffectivePermissions(tenantId, userId, role)
            );
            String refresh = refreshTokenService.issue(tid, uid, userDetails);
            return new OAuthAuthResponse(
                access,
                "Bearer",
                jwtService.expirationSeconds(),
                refresh,
                session.role(),
                tid,
                uid,
                session.setupComplete()
            );
        } finally {
            TenantContext.clear();
        }
    }
}
