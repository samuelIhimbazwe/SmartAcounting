package com.smartchain.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.SyncOperationRequest;
import com.smartchain.entity.SyncQueueItem;
import com.smartchain.repository.SyncQueueRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SyncService {
    private final SyncQueueRepository repository;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    public SyncService(SyncQueueRepository repository, ObjectMapper objectMapper, AuditService auditService) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.auditService = auditService;
    }

    @Transactional
    public UUID enqueue(SyncOperationRequest request) {
        UUID tenantId = requireTenant();
        SyncQueueItem item = new SyncQueueItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(tenantId);
        item.setDeviceId(request.deviceId());
        item.setOperationType(request.operationType());
        item.setEntityType(request.entityType());
        try {
            item.setPayload(objectMapper.writeValueAsString(request.payload()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid sync payload");
        }
        item.setLamportClock(request.lamportClock());
        item.setStatus("PENDING");
        item.setConflictPolicy(request.conflictPolicy() == null || request.conflictPolicy().isBlank()
            ? "LAST_WRITE_WINS" : request.conflictPolicy());
        repository.save(item);
        auditService.logAction("SYNC_ENQUEUED", "SYNC_QUEUE", "{}", "{\"id\":\"" + item.getId() + "\"}");
        return item.getId();
    }

    @Transactional
    public int flushPending() {
        List<SyncQueueItem> pending = repository.findTop50ByStatusOrderByLamportClockAsc("PENDING");
        for (SyncQueueItem item : pending) {
            item.setStatus("SYNCED");
            item.setSyncedAt(Instant.now());
        }
        repository.saveAll(pending);
        return pending.size();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
