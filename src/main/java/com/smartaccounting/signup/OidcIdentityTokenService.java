package com.smartaccounting.signup;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.BadJOSEException;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.proc.BadJWTException;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.smartaccounting.config.OidcClientProperties;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class OidcIdentityTokenService {
    private static final NetHttpTransport NET_HTTP = new NetHttpTransport();
    private static final GsonFactory GSON = GsonFactory.getDefaultInstance();

    private final OidcClientProperties properties;

    public OidcIdentityTokenService(OidcClientProperties properties) {
        this.properties = properties;
    }

    public OidcVerifiedIdentity verify(String providerRaw, String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("idToken is required");
        }
        String provider = providerRaw == null ? "" : providerRaw.trim().toLowerCase(Locale.ROOT);
        return switch (provider) {
            case "google" -> verifyGoogle(idToken.trim());
            case "microsoft" -> verifyMicrosoft(idToken.trim());
            default -> throw new IllegalArgumentException("Unsupported OAuth provider");
        };
    }

    private OidcVerifiedIdentity verifyGoogle(String idToken) {
        List<String> audiences = splitIds(properties.getGoogleClientIds());
        if (audiences.isEmpty()) {
            throw new IllegalStateException("Google OAuth is not configured");
        }
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(NET_HTTP, GSON)
                .setAudience(audiences)
                .build();
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                throw new IllegalArgumentException("Invalid Google ID token");
            }
            GoogleIdToken.Payload payload = token.getPayload();
            if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
                throw new IllegalArgumentException("Google email is not verified");
            }
            String email = payload.getEmail();
            if (email == null || email.isBlank()) {
                throw new IllegalArgumentException("Google token missing email");
            }
            String sub = payload.getSubject();
            if (sub == null || sub.isBlank()) {
                throw new IllegalArgumentException("Google token missing subject");
            }
            String name = payload.get("name") instanceof String s ? s : "";
            if (name.isBlank()) {
                name = email;
            }
            return new OidcVerifiedIdentity("google", sub, email.trim().toLowerCase(Locale.ROOT), name.trim());
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid Google ID token", ex);
        }
    }

    private OidcVerifiedIdentity verifyMicrosoft(String idToken) {
        List<String> allowedAud = splitIds(properties.getMicrosoftClientIds());
        if (allowedAud.isEmpty()) {
            throw new IllegalStateException("Microsoft OAuth is not configured");
        }
        try {
            URL jwksUrl = new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys");
            var jwkSource = JWKSourceBuilder.create(jwksUrl).build();
            JWSKeySelector<SecurityContext> keySelector = new JWSVerificationKeySelector<>(
                JWSAlgorithm.RS256,
                jwkSource
            );
            DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(keySelector);
            processor.setJWTClaimsSetVerifier((claims, context) -> verifyMicrosoftClaims(claims, allowedAud));

            SignedJWT signed = SignedJWT.parse(idToken);
            JWTClaimsSet claims = processor.process(signed, null);

            String sub = claims.getSubject();
            if (sub == null || sub.isBlank()) {
                throw new IllegalArgumentException("Microsoft token missing subject");
            }
            String email = firstNonBlank(
                stringClaim(claims, "preferred_username"),
                stringClaim(claims, "email")
            );
            if (email.isBlank()) {
                throw new IllegalArgumentException("Microsoft token missing email");
            }
            email = email.trim().toLowerCase(Locale.ROOT);
            String name = firstNonBlank(stringClaim(claims, "name"), email);
            return new OidcVerifiedIdentity("microsoft", sub, email, name.trim());
        } catch (IllegalArgumentException | IllegalStateException ex) {
            throw ex;
        } catch (BadJOSEException ex) {
            throw new IllegalArgumentException("Invalid Microsoft ID token", ex);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid Microsoft ID token", ex);
        }
    }

    private static void verifyMicrosoftClaims(JWTClaimsSet claims, List<String> allowedAud) throws BadJWTException {
        String iss = claims.getIssuer();
        if (iss == null
            || !iss.startsWith("https://login.microsoftonline.com/")
            || !iss.endsWith("/v2.0")) {
            throw new BadJWTException("Unexpected issuer");
        }
        Object audObj = claims.getClaim("aud");
        List<String> tokenAudiences = new ArrayList<>();
        if (audObj instanceof String s) {
            tokenAudiences.add(s);
        } else if (audObj instanceof List<?> list) {
            for (Object o : list) {
                if (o instanceof String s) {
                    tokenAudiences.add(s);
                }
            }
        }
        boolean match = tokenAudiences.stream().anyMatch(allowedAud::contains);
        if (!match) {
            throw new BadJWTException("Unexpected audience");
        }
    }

    private static String stringClaim(JWTClaimsSet claims, String name) {
        try {
            String v = claims.getStringClaim(name);
            return v == null ? "" : v;
        } catch (Exception ex) {
            return "";
        }
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        return b == null ? "" : b;
    }

    private static List<String> splitIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());
    }
}
