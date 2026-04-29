package com.smartchain.service;

import com.smartchain.dto.CreateDocumentRequest;
import com.smartchain.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentService {
    private final JdbcTemplate jdbcTemplate;
    private final String storageProvider;
    private final String storageBucket;

    public DocumentService(JdbcTemplate jdbcTemplate,
                           @Value("${smartchain.documents.provider:s3}") String storageProvider,
                           @Value("${smartchain.documents.bucket:smartchain-docs}") String storageBucket) {
        this.jdbcTemplate = jdbcTemplate;
        this.storageProvider = storageProvider;
        this.storageBucket = storageBucket;
    }

    @Transactional
    public Map<String, Object> createUploadRequest(CreateDocumentRequest request) {
        UUID tenant = requireTenant();
        UUID user = requireUser();
        UUID id = UUID.randomUUID();
        String objectKey = tenant + "/" + request.entityType().toLowerCase() + "/" + request.entityId() + "/" + id + "_" + request.fileName();
        jdbcTemplate.update(
            """
            insert into document_files
            (id, tenant_id, entity_type, entity_id, file_name, content_type, storage_provider, object_key, status, created_by, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADED', ?, now())
            """,
            id, tenant, request.entityType().toLowerCase(), request.entityId(), request.fileName(), request.contentType(),
            storageProvider, objectKey, user
        );
        return Map.of(
            "documentId", id,
            "provider", storageProvider,
            "bucket", storageBucket,
            "objectKey", objectKey,
            "uploadUrl", "https://example-upload/" + objectKey
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String entityType, UUID entityId, int page, int size) {
        UUID tenant = requireTenant();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        return jdbcTemplate.query(
            """
            select id, file_name, content_type, storage_provider, object_key, status, created_at
            from document_files
            where tenant_id = ? and entity_type = ? and entity_id = ?
            order by created_at desc offset ? limit ?
            """,
            (rs, row) -> Map.<String, Object>of(
                "id", UUID.fromString(rs.getString("id")),
                "fileName", rs.getString("file_name"),
                "contentType", rs.getString("content_type"),
                "provider", rs.getString("storage_provider"),
                "objectKey", rs.getString("object_key"),
                "status", rs.getString("status"),
                "createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant())
            ),
            tenant, entityType.toLowerCase(), entityId, safePage * safeSize, safeSize
        );
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
