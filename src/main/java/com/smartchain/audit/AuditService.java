package com.smartchain.audit;

import com.smartchain.entity.AuditLog;
import com.smartchain.repository.AuditLogRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class AuditService {
    private static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void logAction(String action, String entityType, String oldValue, String newValue) {
        UUID tenantId = TenantContext.tenantId();
        UUID userId = TenantContext.userId();
        if (tenantId == null || userId == null) {
            return;
        }

        String previousHash = auditLogRepository.findTopByTenantIdOrderByCreatedAtDesc(tenantId)
            .map(AuditLog::getRecordHash)
            .orElse(GENESIS_HASH);

        String payload = tenantId + "|" + userId + "|" + action + "|" + entityType + "|" + oldValue + "|" + newValue;
        String recordHash = sha256(previousHash + payload);

        AuditLog log = new AuditLog();
        log.setId(UUID.randomUUID());
        log.setTenantId(tenantId);
        log.setUserId(userId);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        log.setPreviousHash(previousHash);
        log.setRecordHash(recordHash);
        log.setCreatedAt(Instant.now());
        auditLogRepository.save(log);
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash audit payload", e);
        }
    }
}
