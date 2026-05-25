package com.smartaccounting.controller;

import com.smartaccounting.copilot.RagIngestionService;
import com.smartaccounting.service.TenantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai/admin")
public class AiAdminController {

    private static final Logger log = LoggerFactory.getLogger(AiAdminController.class);

    private final RagIngestionService ragIngestionService;
    private final TenantService tenantService;

    public AiAdminController(RagIngestionService ragIngestionService, TenantService tenantService) {
        this.ragIngestionService = ragIngestionService;
        this.tenantService = tenantService;
    }

    @PostMapping("/reindex")
    @PreAuthorize(PermissionExpressions.TENANT_ADMIN)
    public Map<String, Object> reindex(@RequestParam UUID tenantId) {
        return Map.of("indexedChunks", ragIngestionService.reindexTenant(tenantId));
    }

    /**
     * Reindexes every active tenant synchronously (flush + rebuild embeddings per tenant).
     */
    @PostMapping("/reindex-all")
    @PreAuthorize(PermissionExpressions.TENANT_ADMIN)
    public ResponseEntity<Map<String, Object>> reindexAll() {
        List<String> tenantIds = tenantService.findAllActiveTenantIds();
        Map<String, String> results = new LinkedHashMap<>();
        int succeeded = 0;
        int failed = 0;

        for (String tenantId : tenantIds) {
            log.info("Reindex-all: starting tenant {}", tenantId);
            try {
                int chunks = ragIngestionService.reindexTenant(UUID.fromString(tenantId));
                results.put(tenantId, "OK (" + chunks + " chunks)");
                succeeded++;
                log.info("Reindex-all: completed tenant {} ({} chunks)", tenantId, chunks);
            } catch (Exception e) {
                results.put(tenantId, "FAILED: " + e.getMessage());
                failed++;
                log.error("Reindex-all: failed for tenant {}", tenantId, e);
            }
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("total", tenantIds.size());
        body.put("succeeded", succeeded);
        body.put("failed", failed);
        body.put("results", results);
        return ResponseEntity.ok(body);
    }
}
