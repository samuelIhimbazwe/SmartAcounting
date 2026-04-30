package com.smartchain.security;

import com.smartchain.entity.ServiceAccountApiKey;
import com.smartchain.repository.ServiceAccountApiKeyRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceAccountApiKeyService {
    private final ServiceAccountApiKeyRepository repository;

    public ServiceAccountApiKeyService(ServiceAccountApiKeyRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public CreatedKey create(String serviceAccountName, Set<String> scopes, Instant expiresAt) {
        UUID tenantId = requireTenant();
        UUID serviceUserId = UUID.randomUUID();
        String rawSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8));
        String prefix = rawSecret.substring(0, Math.min(rawSecret.length(), 12));
        String rawKey = "sc_" + prefix + "_" + rawSecret;

        ServiceAccountApiKey key = new ServiceAccountApiKey();
        key.setId(UUID.randomUUID());
        key.setTenantId(tenantId);
        key.setServiceUserId(serviceUserId);
        key.setServiceAccountName(serviceAccountName);
        key.setKeyPrefix(prefix);
        key.setKeyHash(hash(rawKey));
        key.setScopesCsv(normalizeScopes(scopes).stream().sorted().collect(Collectors.joining(",")));
        key.setActive(true);
        key.setExpiresAt(expiresAt);
        key.setCreatedAt(Instant.now());
        repository.save(key);
        return new CreatedKey(key.getId(), rawKey, key.getServiceUserId(), key.getServiceAccountName(), parseScopes(key.getScopesCsv()), key.getExpiresAt());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() {
        UUID tenantId = requireTenant();
        return repository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
            .map(k -> Map.<String, Object>of(
                "id", k.getId(),
                "serviceUserId", k.getServiceUserId(),
                "serviceAccountName", k.getServiceAccountName(),
                "keyPrefix", k.getKeyPrefix(),
                "scopes", parseScopes(k.getScopesCsv()),
                "active", k.isActive(),
                "expiresAt", String.valueOf(k.getExpiresAt()),
                "lastUsedAt", String.valueOf(k.getLastUsedAt()),
                "createdAt", String.valueOf(k.getCreatedAt())
            ))
            .toList();
    }

    @Transactional
    public Map<String, Object> revoke(UUID id) {
        UUID tenantId = requireTenant();
        ServiceAccountApiKey key = repository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new IllegalArgumentException("API key not found"));
        key.setActive(false);
        repository.save(key);
        return Map.of("id", key.getId(), "active", false);
    }

    @Transactional
    public Optional<ValidatedKey> validate(String rawKey) {
        if (rawKey == null || rawKey.isBlank() || !rawKey.startsWith("sc_")) {
            return Optional.empty();
        }
        String[] parts = rawKey.split("_", 3);
        if (parts.length < 3) return Optional.empty();
        String prefix = parts[1];
        String hashed = hash(rawKey);
        Instant now = Instant.now();
        for (ServiceAccountApiKey key : repository.findByKeyPrefixAndActiveTrue(prefix)) {
            if (!hashed.equals(key.getKeyHash())) continue;
            if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(now)) continue;
            key.setLastUsedAt(now);
            repository.save(key);
            return Optional.of(new ValidatedKey(
                key.getTenantId(),
                key.getServiceUserId(),
                key.getServiceAccountName(),
                parseScopes(key.getScopesCsv())
            ));
        }
        return Optional.empty();
    }

    private Set<String> parseScopes(String csv) {
        if (csv == null || csv.isBlank()) return Set.of();
        return normalizeScopes(Arrays.stream(csv.split(",")).collect(Collectors.toSet()));
    }

    private Set<String> normalizeScopes(Set<String> scopes) {
        return scopes.stream()
            .filter(s -> s != null && !s.isBlank())
            .map(s -> s.trim().toUpperCase())
            .collect(Collectors.toSet());
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed hashing API key", e);
        }
    }

    public record CreatedKey(UUID id, String rawKey, UUID serviceUserId, String serviceAccountName, Set<String> scopes, Instant expiresAt) {}
    public record ValidatedKey(UUID tenantId, UUID serviceUserId, String serviceAccountName, Set<String> scopes) {}
}
