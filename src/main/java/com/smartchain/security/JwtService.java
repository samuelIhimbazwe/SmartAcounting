package com.smartchain.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.SecurityException;
import io.jsonwebtoken.security.Keys;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class JwtService {
    private final String configuredSecret;
    private final String currentKid;
    private final String configuredLegacySecrets;
    private final String jwtSecretFile;
    private final String jwtLegacySecretsFile;
    private final long expirationMinutes;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtService(@Value("${smartchain.security.jwt-secret}") String secret,
                      @Value("${smartchain.security.jwt-key-id:smartchain-k1}") String currentKid,
                      @Value("${smartchain.security.jwt-legacy-secrets:}") String legacySecrets,
                      @Value("${smartchain.security.jwt-secret-file:}") String jwtSecretFile,
                      @Value("${smartchain.security.jwt-legacy-secrets-file:}") String jwtLegacySecretsFile,
                      @Value("${smartchain.security.jwt-expiration-minutes}") long expirationMinutes) {
        this.configuredSecret = secret;
        this.currentKid = currentKid;
        this.configuredLegacySecrets = legacySecrets;
        this.jwtSecretFile = jwtSecretFile;
        this.jwtLegacySecretsFile = jwtLegacySecretsFile;
        this.expirationMinutes = expirationMinutes;
    }

    public String generateToken(UserDetails userDetails, String tenantId, String userId) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(expirationMinutes * 60);
        Collection<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toSet());
        SecretKey activeKey = Keys.hmacShaKeyFor(resolveActiveSecret().getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
            .header().add("kid", currentKid).and()
            .subject(userDetails.getUsername())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .claims(Map.of(
                "tenantId", tenantId,
                "userId", userId,
                "roles", roles
            ))
            .signWith(activeKey)
            .compact();
    }

    public Claims parse(String token) {
        Map<String, SecretKey> verificationKeys = loadVerificationKeys();
        String kid = parseKid(token);
        if (kid != null && verificationKeys.containsKey(kid)) {
            return Jwts.parser().verifyWith(verificationKeys.get(kid)).build().parseSignedClaims(token).getPayload();
        }
        for (SecretKey key : verificationKeys.values()) {
            try {
                return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            } catch (SecurityException | IllegalArgumentException ignored) {
                // Try next known key for rotated-token compatibility.
            }
        }
        throw new IllegalArgumentException("JWT signature verification failed");
    }

    public long expirationSeconds() {
        return expirationMinutes * 60;
    }

    private String parseKid(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                return null;
            }
            String json = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            Map<?, ?> map = objectMapper.readValue(json, Map.class);
            Object kid = map.get("kid");
            return kid == null ? null : String.valueOf(kid);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resolveActiveSecret() {
        String fromFile = readFirstLine(jwtSecretFile);
        return fromFile == null || fromFile.isBlank() ? configuredSecret : fromFile;
    }

    private String resolveLegacySecrets() {
        String fromFile = readFirstLine(jwtLegacySecretsFile);
        return fromFile == null ? configuredLegacySecrets : fromFile;
    }

    private Map<String, SecretKey> loadVerificationKeys() {
        Map<String, SecretKey> verificationKeys = new HashMap<>();
        verificationKeys.put(currentKid, Keys.hmacShaKeyFor(resolveActiveSecret().getBytes(StandardCharsets.UTF_8)));
        String legacySecrets = resolveLegacySecrets();
        if (legacySecrets != null && !legacySecrets.isBlank()) {
            int idx = 0;
            for (String legacy : Arrays.stream(legacySecrets.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList()) {
                verificationKeys.put("legacy-" + idx++, Keys.hmacShaKeyFor(legacy.getBytes(StandardCharsets.UTF_8)));
            }
        }
        return verificationKeys;
    }

    private String readFirstLine(String filePath) {
        try {
            if (filePath == null || filePath.isBlank()) return null;
            Path path = Path.of(filePath);
            if (!Files.exists(path)) return null;
            String contents = Files.readString(path, StandardCharsets.UTF_8).trim();
            if (contents.isBlank()) return null;
            return contents;
        } catch (Exception ignored) {
            return null;
        }
    }
}
