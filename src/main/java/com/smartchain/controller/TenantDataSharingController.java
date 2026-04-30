package com.smartchain.controller;

import com.smartchain.dto.CreateDataSharingGrantRequest;
import com.smartchain.service.TenantDataSharingService;
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
@RequestMapping("/api/v1/platform/data-sharing")
public class TenantDataSharingController {
    private final TenantDataSharingService service;

    public TenantDataSharingController(TenantDataSharingService service) {
        this.service = service;
    }

    @PostMapping("/grants")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public Map<String, UUID> grant(@RequestBody @Valid CreateDataSharingGrantRequest request) {
        return Map.of("grantId", service.grant(request));
    }

    @GetMapping("/grants")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public List<Map<String, Object>> grants(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "50") int size) {
        return service.listOutgoing(page, size);
    }

    @PostMapping("/grants/{id}/revoke")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public Map<String, Object> revoke(@PathVariable UUID id) {
        return service.revoke(id);
    }
}
