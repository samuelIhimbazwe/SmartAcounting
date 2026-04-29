package com.smartchain.controller;

import com.smartchain.dto.CreateAssetRequest;
import com.smartchain.service.AssetService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assets")
public class AssetController {
    private final AssetService service;

    public AssetController(AssetService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'ASSET_WRITE')")
    public Map<String, UUID> create(@RequestBody @Valid CreateAssetRequest request) {
        return Map.of("assetId", service.create(request));
    }

    @GetMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'ASSET_READ')")
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "50") int size) {
        return service.list(page, size);
    }

    @GetMapping("/{assetId}/depreciation-schedule")
    @PreAuthorize("@permissionGuard.has(authentication, 'ASSET_READ')")
    public Map<String, Object> depreciationSchedule(@PathVariable UUID assetId) {
        return service.depreciationSchedule(assetId);
    }
}
