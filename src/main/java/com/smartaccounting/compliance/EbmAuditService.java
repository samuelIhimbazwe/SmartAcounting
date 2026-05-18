package com.smartaccounting.compliance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.entity.EbmAuditLog;
import com.smartaccounting.repository.EbmAuditLogRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class EbmAuditService {
    private final EbmAuditLogRepository repository;
    private final ObjectMapper objectMapper;

    public EbmAuditService(EbmAuditLogRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void record(UUID tenantId, UUID receiptId, Map<String, Object> request, Object response, String status, String error) {
        EbmAuditLog row = new EbmAuditLog();
        row.setId(UUID.randomUUID());
        row.setTenantId(tenantId != null ? tenantId : requireTenant());
        row.setReceiptId(receiptId);
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
