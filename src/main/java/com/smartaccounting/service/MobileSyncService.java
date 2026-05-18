package com.smartaccounting.service;

import com.smartaccounting.dto.SyncStatusResponse;
import com.smartaccounting.repository.ActionQueueItemRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class MobileSyncService {
    private final ActionQueueItemRepository actionQueueRepository;
    private final JdbcTemplate jdbcTemplate;

    public MobileSyncService(ActionQueueItemRepository actionQueueRepository, JdbcTemplate jdbcTemplate) {
        this.actionQueueRepository = actionQueueRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    public SyncStatusResponse getSyncStatus() {
        UUID tenantId = requireTenant();
        long pending = actionQueueRepository.countByTenantIdAndApprovalStatus(tenantId, "PENDING");
        Long alerts = jdbcTemplate.queryForObject(
            """
            select count(*) from anomaly_cases
            where tenant_id = ? and upper(status) = 'OPEN'
            """,
            Long.class,
            tenantId
        );
        Long lastEvent = jdbcTemplate.queryForObject(
            """
            select coalesce(extract(epoch from max(created_at))::bigint, 0)
            from outbox_events where tenant_id = ?
            """,
            Long.class,
            tenantId
        );
        return new SyncStatusResponse(
            pending,
            alerts == null ? 0 : alerts,
            lastEvent == null ? 0 : lastEvent,
            Instant.now()
        );
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
