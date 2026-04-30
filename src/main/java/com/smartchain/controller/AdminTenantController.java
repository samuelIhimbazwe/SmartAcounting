package com.smartchain.controller;

import com.smartchain.dto.ProvisionTenantRequest;
import com.smartchain.service.TenantAdminService;
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
@RequestMapping("/api/v1/admin/tenants")
public class AdminTenantController {
    private final TenantAdminService service;

    public AdminTenantController(TenantAdminService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public Map<String, Object> provision(@RequestBody @Valid ProvisionTenantRequest request) {
        return service.provision(request.name());
    }

    @PostMapping("/{tenantId}/disable")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public Map<String, Object> disable(@PathVariable UUID tenantId) {
        return service.disable(tenantId);
    }

    @GetMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "50") int size) {
        return service.list(page, size);
    }
}
