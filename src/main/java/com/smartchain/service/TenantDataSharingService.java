package com.smartchain.service;

import com.smartchain.dto.CreateDataSharingGrantRequest;
import com.smartchain.tenant.TenantContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TenantDataSharingService {
    private final JdbcTemplate jdbcTemplate;

    public TenantDataSharingService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public UUID grant(CreateDataSharingGrantRequest request) {
        UUID source = requireTenant();
        UUID user = requireUser();
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
            """
            insert into tenant_data_sharing_grants
            (id, source_tenant_id, target_tenant_id, resource_type, scope, status, created_by, created_at)
            values (?, ?, ?, ?, ?, 'ACTIVE', ?, now())
            """,
            id, source, request.targetTenantId(), request.resourceType(), request.scope(), user
        );
        return id;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listOutgoing(int page, int size) {
        UUID source = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        return jdbcTemplate.query(
            """
            select id, target_tenant_id, resource_type, scope, status, created_at, revoked_at
            from tenant_data_sharing_grants
            where source_tenant_id = ?
            order by created_at desc
            offset ? limit ?
            """,
            (rs, row) -> Map.<String, Object>of(
                "id", UUID.fromString(rs.getString("id")),
                "targetTenantId", UUID.fromString(rs.getString("target_tenant_id")),
                "resourceType", rs.getString("resource_type"),
                "scope", rs.getString("scope"),
                "status", rs.getString("status"),
                "createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant()),
                "revokedAt", String.valueOf(rs.getTimestamp("revoked_at") == null ? null : rs.getTimestamp("revoked_at").toInstant())
            ),
            source, safePage * safeSize, safeSize
        );
    }

    @Transactional
    public Map<String, Object> revoke(UUID id) {
        UUID source = requireTenant();
        int updated = jdbcTemplate.update(
            "update tenant_data_sharing_grants set status = 'REVOKED', revoked_at = now() where id = ? and source_tenant_id = ?",
            id, source
        );
        if (updated == 0) throw new IllegalArgumentException("Sharing grant not found");
        return Map.of("id", id, "status", "REVOKED");
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }

    private UUID requireUser() {
        if (TenantContext.userId() == null) throw new IllegalStateException("User context is required");
        return TenantContext.userId();
    }
}
