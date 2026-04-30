package com.smartchain.service;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.InstallPluginRequest;
import com.smartchain.entity.TenantPlugin;
import com.smartchain.repository.TenantPluginRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
public class MarketplaceService {
    private final TenantPluginRepository repository;
    private final AuditService auditService;
    public MarketplaceService(TenantPluginRepository repository, AuditService auditService) {
        this.repository = repository; this.auditService = auditService;
    }
    @Transactional
    public UUID install(InstallPluginRequest req) {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        TenantPlugin plugin = new TenantPlugin();
        plugin.setId(UUID.randomUUID());
        plugin.setTenantId(TenantContext.tenantId());
        plugin.setPluginKey(req.pluginKey());
        plugin.setVersion(req.version());
        plugin.setEnabled(true);
        plugin.setCreatedAt(Instant.now());
        repository.save(plugin);
        auditService.logAction("PLUGIN_INSTALLED", "MARKETPLACE", "{}", "{\"id\":\"" + plugin.getId() + "\"}");
        return plugin.getId();
    }
}
