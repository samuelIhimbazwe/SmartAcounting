package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.copilot.CopilotActionExecutorService;
import com.smartaccounting.copilot.CopilotActionPlan;
import com.smartaccounting.entity.ActionQueueItem;
import com.smartaccounting.repository.ActionQueueItemRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class ActionQueueService {
    private final ActionQueueItemRepository repository;
    private final AuditService auditService;
    private final AuthSessionService authSessionService;
    private final CopilotActionExecutorService copilotActionExecutorService;
    private final ObjectMapper objectMapper;

    public ActionQueueService(
        ActionQueueItemRepository repository,
        AuditService auditService,
        AuthSessionService authSessionService,
        CopilotActionExecutorService copilotActionExecutorService,
        ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.auditService = auditService;
        this.authSessionService = authSessionService;
        this.copilotActionExecutorService = copilotActionExecutorService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public UUID enqueue(String type, String ref, String payloadJson) {
        requireTenant();
        ActionQueueItem item = new ActionQueueItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(TenantContext.tenantId());
        item.setRequestedBy(TenantContext.userId());
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
        item.setRequestedBy(TenantContext.userId());
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

    @Transactional
    public UUID enqueuePendingApproval(CopilotActionPlan plan, String ref, Instant expiresAt) {
        requireTenant();
        ActionQueueItem item = new ActionQueueItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(TenantContext.tenantId());
        item.setRequestedBy(requireUser());
        item.setActionType(plan.type());
        item.setActionRef(ref);
        item.setPermissionCode(plan.permissionCode());
        item.setPreviewTitle(plan.title());
        item.setPreviewSummary(plan.summary());
        item.setWarningMessage(plan.warningMessage());
        item.setReversible(plan.reversible());
        item.setUndoActionType(plan.undoActionType());
        item.setPayload(toJson(plan.payload()));
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
            processQueuedItem(item);
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
            .filter(this::canCurrentUserReview)
            .skip((long) safePage * safeSize)
            .limit(safeSize)
            .map(this::toApprovalMap)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> recentActions(int size) {
        requireTenant();
        int safeSize = Math.min(25, Math.max(1, size));
        return repository.findByTenantIdOrderByCreatedAtDesc(TenantContext.tenantId(), PageRequest.of(0, safeSize * 3)).stream()
            .filter(this::isVisibleToCurrentUser)
            .filter(item -> !"PENDING_APPROVAL".equals(item.getStatus()))
            .limit(safeSize)
            .map(this::toRecentActionMap)
            .toList();
    }

    @Transactional
    public Map<String, Object> approve(UUID id) {
        ActionQueueItem item = requireOwned(id);
        ensureCurrentUserCanReview(item);
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
        processQueuedItem(item);
        return Map.of("id", id, "approvalStatus", item.getApprovalStatus(), "status", item.getStatus());
    }

    @Transactional
    public Map<String, Object> reject(UUID id, String reason) {
        ActionQueueItem item = requireOwned(id);
        ensureCurrentUserCanReview(item);
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
    public Map<String, Object> undo(UUID id) {
        ActionQueueItem item = requireOwned(id);
        ensureCurrentUserCanReview(item);
        if (!Boolean.TRUE.equals(item.getReversible()) || item.getUndoActionType() == null || item.getUndoPayload() == null) {
            throw new IllegalArgumentException("This AI action does not support undo");
        }
        if (!"PROCESSED".equals(item.getStatus())) {
            throw new IllegalArgumentException("Only processed AI actions can be undone");
        }

        ActionQueueItem undoAction = new ActionQueueItem();
        undoAction.setId(UUID.randomUUID());
        undoAction.setTenantId(item.getTenantId());
        undoAction.setRequestedBy(requireUser());
        undoAction.setApprovalDecidedBy(requireUser());
        undoAction.setActionType(item.getUndoActionType());
        undoAction.setPayload(item.getUndoPayload());

        CopilotActionExecutorService.ExecutionResult result = copilotActionExecutorService.execute(undoAction);
        item.setStatus("UNDONE");
        item.setProcessedAt(Instant.now());
        item.setResultSummary(result.summary());
        item.setExecutionError(null);
        repository.save(item);
        auditService.logAction("AI_ACTION_UNDONE", "ACTION_QUEUE", "{}", "{\"id\":\"" + item.getId() + "\"}");
        return toRecentActionMap(item);
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

    private void processQueuedItem(ActionQueueItem item) {
        try {
            CopilotActionExecutorService.ExecutionResult result = copilotActionExecutorService.execute(item);
            item.setStatus("PROCESSED");
            item.setProcessedAt(Instant.now());
            item.setResultEntityType(result.entityType());
            item.setResultEntityId(result.entityId());
            item.setResultSummary(result.summary());
            item.setExecutionError(null);
            if (result.undoPayload() != null) {
                item.setUndoPayload(toJson(result.undoPayload()));
            }
            repository.save(item);
            auditService.logAction("ACTION_PROCESSED", "ACTION_QUEUE", "{}", "{\"id\":\"" + item.getId() + "\"}");
        } catch (Exception ex) {
            item.setStatus("FAILED");
            item.setProcessedAt(Instant.now());
            item.setExecutionError(ex.getMessage());
            repository.save(item);
            auditService.logAction("ACTION_FAILED", "ACTION_QUEUE", "{}", "{\"id\":\"" + item.getId() + "\",\"error\":\"" + ex.getMessage() + "\"}");
        }
    }

    private Map<String, Object> toApprovalMap(ActionQueueItem item) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", item.getId());
        out.put("runId", item.getActionRef());
        out.put("status", item.getApprovalStatus());
        out.put("approvalStatus", item.getApprovalStatus());
        out.put("requestedAction", item.getPreviewTitle() == null ? item.getActionType() : item.getPreviewTitle());
        out.put("summary", item.getPreviewSummary() == null ? "" : item.getPreviewSummary());
        out.put("permissionCode", item.getPermissionCode() == null ? "" : item.getPermissionCode());
        out.put("approvalExpiresAt", String.valueOf(item.getApprovalExpiresAt()));
        out.put("createdAt", String.valueOf(item.getCreatedAt()));
        out.put("reversible", Boolean.TRUE.equals(item.getReversible()));
        out.put("undoAvailable", Boolean.TRUE.equals(item.getReversible()) && item.getUndoPayload() != null);
        out.put("warningMessage", item.getWarningMessage() == null ? "" : item.getWarningMessage());
        out.put("preview", parseJson(item.getPayload()));
        return out;
    }

    private Map<String, Object> toRecentActionMap(ActionQueueItem item) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", item.getId());
        out.put("type", item.getActionType());
        out.put("status", item.getStatus());
        out.put("title", item.getPreviewTitle() == null ? item.getActionType() : item.getPreviewTitle());
        out.put("summary", item.getResultSummary() == null ? item.getPreviewSummary() : item.getResultSummary());
        out.put("permissionCode", item.getPermissionCode());
        out.put("reversible", Boolean.TRUE.equals(item.getReversible()));
        out.put("undoAvailable", Boolean.TRUE.equals(item.getReversible()) && item.getUndoPayload() != null && "PROCESSED".equals(item.getStatus()));
        out.put("warningMessage", item.getWarningMessage());
        out.put("entityType", item.getResultEntityType());
        out.put("entityId", item.getResultEntityId());
        out.put("createdAt", String.valueOf(item.getCreatedAt()));
        out.put("processedAt", String.valueOf(item.getProcessedAt()));
        return out;
    }

    private boolean canCurrentUserReview(ActionQueueItem item) {
        String permissionCode = item.getPermissionCode();
        if (permissionCode == null || permissionCode.isBlank()) {
            return true;
        }
        return currentPermissions().contains(permissionCode.trim().toUpperCase(Locale.ROOT));
    }

    private boolean isVisibleToCurrentUser(ActionQueueItem item) {
        UUID currentUser = requireUser();
        if (currentUser.equals(item.getRequestedBy()) || currentUser.equals(item.getApprovalDecidedBy())) {
            return true;
        }
        return canCurrentUserReview(item);
    }

    private void ensureCurrentUserCanReview(ActionQueueItem item) {
        if (!canCurrentUserReview(item)) {
            throw new IllegalArgumentException("You do not have permission to review this AI action");
        }
    }

    private Set<String> currentPermissions() {
        return authSessionService.loadEffectivePermissions(requireTenantId(), requireUser(), null);
    }

    private Object parseJson(String json) {
        try {
            return objectMapper.readValue(json == null ? "{}" : json, Object.class);
        } catch (Exception ex) {
            return Map.of("raw", json);
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Map.of() : value);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize action payload", ex);
        }
    }

    private void requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
    }

    private UUID requireTenantId() {
        requireTenant();
        return TenantContext.tenantId();
    }

    private UUID requireUser() {
        if (TenantContext.userId() == null) throw new IllegalStateException("User context is required");
        return TenantContext.userId();
    }

    private ActionQueueItem requireOwned(UUID id) {
        requireTenant();
        return repository.findByIdAndTenantId(id, TenantContext.tenantId())
            .orElseThrow(() -> new IllegalArgumentException("Action item not found"));
    }
}
