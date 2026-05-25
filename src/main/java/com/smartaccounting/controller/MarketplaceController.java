package com.smartaccounting.controller;
import com.smartaccounting.dto.InstallPluginRequest;
import com.smartaccounting.service.MarketplaceService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/marketplace")
public class MarketplaceController {
    private final MarketplaceService service;
    public MarketplaceController(MarketplaceService service) { this.service = service; }
    @PostMapping("/plugins/install")
    @PreAuthorize(PermissionExpressions.TENANT_ADMIN)
    public Map<String, UUID> install(@RequestBody @Valid InstallPluginRequest req) {
        return Map.of("pluginInstallId", service.install(req));
    }
}
