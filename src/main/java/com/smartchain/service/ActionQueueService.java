package com.smartchain.service;

import com.smartchain.audit.AuditService;
import com.smartchain.entity.ActionQueueItem;
import com.smartchain.repository.ActionQueueItemRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ActionQueueService {
    private final ActionQueueItemRepository repository;
    private final AuditService auditService;

    public ActionQueueService(ActionQueueItemRepository repository, AuditService auditService) {
        this.repository = repository;
        this.auditService = auditService;
    }

    @Transactional
    public UUID enqueue(String type, String ref, String payloadJson) {
        requireTenant();
        ActionQueueItem item = new ActionQueueItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(TenantContext.tenantId());
        item.setActionType(type);
        item.setActionRef(ref);
        item.setPayload(payloadJson == null ? "{}" : payloadJson);
        item.setStatus("QUEUED");
        item.setApprovalStatus("NOT_REQUIRED");
        item.setCreatedAt(Instant.now());
        repository.save(item);
        return item.getId();
    }

    @Transactional
    public UUID enqueuePendingApproval(String type, String ref, String payloadJson, Instant expiresAt) {
        requireTenant();
        ActionQueueItem item = new ActionQueueItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(TenantContext.tenantId());
        item.setActionType(type);
        item.setActionRef(ref);
        item.setPayload(payloadJson == null ? "{}" : payloadJson);
        item.setStatus("PENDING_APPROVAL");
        item.setApprovalStatus("PENDING");
        item.setApprovalExpiresAt(expiresAt);
        item.setCreatedAt(Instant.now());
        repository.save(item);
        return item.getId();
    }

    @Transactional(readOnly = true)
    public List<ActionQueueItem> queued() {
        return repository.findTop100ByStatusOrderByCreatedAtAsc("QUEUED");
    }

    @Transactional(readOnly = true)
    public List<ActionQueueItem> queued(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        return repository.findByStatusOrderByCreatedAtAsc("QUEUED", PageRequest.of(safePage, safeSize));
    }

    @Transactional
    public int processBatch() {
        List<ActionQueueItem> batch = repository.findTop100ByStatusOrderByCreatedAtAsc("QUEUED").stream().limit(30).toList();
        for (ActionQueueItem item : batch) {
            item.setStatus("PROCESSED");
            item.setProcessedAt(Instant.now());
            repository.save(item);
            auditService.logAction("ACTION_PROCESSED", "ACTION_QUEUE", "{}", "{\"id\":\"" + item.getId() + "\"}");
        }
        return batch.size();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendingApprovals(int page, int size) {
        requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        return repository.findTop100ByApprovalStatusOrderByCreatedAtAsc("PENDING").stream()
            .filter(i -> TenantContext.tenantId().equals(i.getTenantId()))
            .skip((long) safePage * safeSize)
            .limit(safeSize)
            .map(i -> Map.<String, Object>of(
                "id", i.getId(),
                "type", i.getActionType(),
                "ref", i.getActionRef(),
                "status", i.getStatus(),
                "approvalStatus", i.getApprovalStatus(),
                "approvalExpiresAt", String.valueOf(i.getApprovalExpiresAt()),
                "createdAt", String.valueOf(i.getCreatedAt())
            )).toList();
    }

    @Transactional
    public Map<String, Object> approve(UUID id) {
        ActionQueueItem item = requireOwned(id);
        if (!"PENDING".equals(item.getApprovalStatus())) {
            throw new IllegalArgumentException("Approval request is not pending");
        }
        if (item.getApprovalExpiresAt() != null && item.getApprovalExpiresAt().isBefore(Instant.now())) {
            item.setStatus("EXPIRED");
            item.setApprovalStatus("EXPIRED");
            item.setApprovalDecidedAt(Instant.now());
            repository.save(item);
            return Map.of("id", id, "approvalStatus", "EXPIRED", "status", "EXPIRED");
        }
        item.setApprovalStatus("APPROVED");
        item.setStatus("QUEUED");
        item.setApprovalDecidedAt(Instant.now());
        item.setApprovalDecidedBy(TenantContext.userId());
        repository.save(item);
        return Map.of("id", id, "approvalStatus", "APPROVED", "status", "QUEUED");
    }

    @Transactional
    public Map<String, Object> reject(UUID id, String reason) {
        ActionQueueItem item = requireOwned(id);
        if (!"PENDING".equals(item.getApprovalStatus())) {
            throw new IllegalArgumentException("Approval request is not pending");
        }
        item.setApprovalStatus("REJECTED");
        item.setStatus("REJECTED");
        item.setApprovalDecidedAt(Instant.now());
        item.setApprovalDecidedBy(TenantContext.userId());
        item.setApprovalReason(reason == null ? "Rejected by approver" : reason);
        repository.save(item);
        return Map.of("id", id, "approvalStatus", "REJECTED", "status", "REJECTED");
    }

    @Transactional
    @Scheduled(cron = "0 */2 * * * *")
    public int expirePendingApprovals() {
        Instant now = Instant.now();
        int changed = 0;
        for (ActionQueueItem item : repository.findTop100ByApprovalStatusOrderByCreatedAtAsc("PENDING")) {
            if (item.getApprovalExpiresAt() != null && item.getApprovalExpiresAt().isBefore(now)) {
                item.setApprovalStatus("EXPIRED");
                item.setStatus("EXPIRED");
                item.setApprovalDecidedAt(now);
                repository.save(item);
                changed++;
            }
        }
        return changed;
    }

    private void requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
    }

    private ActionQueueItem requireOwned(UUID id) {
        requireTenant();
        return repository.findByIdAndTenantId(id, TenantContext.tenantId())
            .orElseThrow(() -> new IllegalArgumentException("Action item not found"));
    }
}
