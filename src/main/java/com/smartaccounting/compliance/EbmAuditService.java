package com.smartaccounting.compliance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.entity.EbmAuditLog;
import com.smartaccounting.entity.User;
import com.smartaccounting.repository.EbmAuditLogRepository;
import com.smartaccounting.repository.UserRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EbmAuditService {
    private static final String DEFAULT_ACTION = "EBM_RECEIPT_SUBMIT";

    private final EbmAuditLogRepository repository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public EbmAuditService(EbmAuditLogRepository repository,
                           UserRepository userRepository,
                           ObjectMapper objectMapper) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void record(UUID tenantId, UUID receiptId, Map<String, Object> request, Object response, String status, String error) {
        UUID userId = TenantContext.userId();
        String documentRef = receiptId != null ? receiptId.toString() : null;
        record(tenantId, receiptId, userId, DEFAULT_ACTION, documentRef, request, response, status, error);
    }

    @Transactional
    public void record(UUID tenantId,
                       UUID receiptId,
                       UUID userId,
                       String action,
                       String documentRef,
                       Map<String, Object> request,
                       Object response,
                       String status,
                       String error) {
        EbmAuditLog row = new EbmAuditLog();
        row.setId(UUID.randomUUID());
        row.setTenantId(tenantId != null ? tenantId : requireTenant());
        row.setReceiptId(receiptId);
        row.setUserId(userId);
        row.setAction(action != null && !action.isBlank() ? action : DEFAULT_ACTION);
        row.setDocumentRef(documentRef != null ? documentRef : (receiptId != null ? receiptId.toString() : null));
        row.setRequestPayload(toJson(request));
        row.setResponsePayload(response == null ? null : toJson(response));
        row.setStatus(status);
        row.setSentAt(Instant.now());
        row.setRespondedAt("SUCCESS".equals(status) ? Instant.now() : null);
        row.setErrorMessage(error);
        row.setCreatedAt(Instant.now());
        repository.save(row);
    }

    @Transactional(readOnly = true)
    public Page<EbmAuditLog> list(Pageable pageable) {
        return repository.findByTenantIdOrderByCreatedAtDesc(requireTenant(), pageable);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> auditLogPage(Pageable pageable) {
        Page<EbmAuditLog> page = list(pageable);
        return Map.of(
            "items", toApiItems(page.getContent()),
            "total", page.getTotalElements(),
            "page", page.getNumber(),
            "size", page.getSize()
        );
    }

    private List<Map<String, Object>> toApiItems(List<EbmAuditLog> rows) {
        Set<UUID> userIds = rows.stream()
            .map(EbmAuditLog::getUserId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        Map<UUID, String> usernames = userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(User::getId, User::getUsername, (a, b) -> a));

        return rows.stream().map(row -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.getId());
            item.put("date", row.getSentAt() != null ? row.getSentAt() : row.getCreatedAt());
            item.put("user", row.getUserId() == null
                ? "system"
                : usernames.getOrDefault(row.getUserId(), row.getUserId().toString()));
            item.put("action", row.getAction() != null ? row.getAction() : DEFAULT_ACTION);
            item.put("documentRef", row.getDocumentRef() != null
                ? row.getDocumentRef()
                : (row.getReceiptId() != null ? row.getReceiptId().toString() : ""));
            item.put("status", row.getStatus());
            item.put("receiptId", row.getReceiptId());
            item.put("errorMessage", row.getErrorMessage());
            return item;
        }).toList();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return String.valueOf(value);
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
