package com.smartchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.entity.IdempotencyRecord;
import com.smartchain.exception.IdempotencyConflictException;
import com.smartchain.repository.IdempotencyRecordRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class IdempotencyService {
    private final IdempotencyRecordRepository repository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyRecordRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Optional<Map<String, Object>> begin(UUID tenantId, String routeKey, String idempotencyKey, Object requestBody) {
        if (tenantId == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        String hash = requestHash(requestBody);
        Optional<IdempotencyRecord> existing = repository.findByTenantIdAndRouteKeyAndIdempotencyKey(tenantId, routeKey, idempotencyKey);
        if (existing.isPresent()) {
            IdempotencyRecord record = existing.get();
            if (!record.getRequestHash().equals(hash)) {
                throw new IdempotencyConflictException("Idempotency key reused with different request payload");
            }
            if ("COMPLETED".equals(record.getStatus()) && record.getResponseJson() != null) {
                return Optional.of(readJson(record.getResponseJson()));
            }
            throw new IdempotencyConflictException("Request with this idempotency key is already in progress");
        }

        IdempotencyRecord record = new IdempotencyRecord();
        record.setId(UUID.randomUUID());
        record.setTenantId(tenantId);
        record.setRouteKey(routeKey);
        record.setIdempotencyKey(idempotencyKey);
        record.setRequestHash(hash);
        record.setStatus("IN_PROGRESS");
        record.setCreatedAt(Instant.now());
        record.setUpdatedAt(Instant.now());
        try {
            repository.save(record);
        } catch (DataIntegrityViolationException ex) {
            throw new IdempotencyConflictException("Concurrent request detected for same idempotency key");
        }
        return Optional.empty();
    }

    @Transactional
    public void complete(UUID tenantId, String routeKey, String idempotencyKey, Map<String, Object> response) {
        IdempotencyRecord record = repository.findByTenantIdAndRouteKeyAndIdempotencyKey(tenantId, routeKey, idempotencyKey)
            .orElseThrow(() -> new IdempotencyConflictException("Idempotency record not found"));
        try {
            record.setResponseJson(objectMapper.writeValueAsString(response));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to store idempotent response", e);
        }
        record.setStatus("COMPLETED");
        record.setUpdatedAt(Instant.now());
        repository.save(record);
    }

    public String requestHash(Object requestBody) {
        try {
            byte[] bodyBytes = objectMapper.writeValueAsBytes(requestBody);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(bodyBytes));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to hash idempotent request", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readJson(String json) {
        try {
            return objectMapper.readValue(json.getBytes(StandardCharsets.UTF_8), Map.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read idempotent response", e);
        }
    }
}
