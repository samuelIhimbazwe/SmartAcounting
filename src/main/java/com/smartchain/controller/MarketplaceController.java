package com.smartchain.controller;
import com.smartchain.dto.InstallPluginRequest;
import com.smartchain.service.MarketplaceService;
import jakarta.validation.Valid;
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
    @PreAuthorize("hasRole('CEO') or hasRole('CFO')")
    public Map<String, UUID> install(@RequestBody @Valid InstallPluginRequest req) {
        return Map.of("pluginInstallId", service.install(req));
    }
}
