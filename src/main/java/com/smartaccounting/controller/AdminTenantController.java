package com.smartaccounting.controller;

import com.smartaccounting.dto.ProvisionTenantRequest;
import com.smartaccounting.dto.admin.UpdateTenantPlanRequest;
import com.smartaccounting.service.TenantAdminService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
    @PreAuthorize("@permissionGuard.has(authentication, 'TENANT_CONFIG')")
    public Map<String, Object> provision(@RequestBody @Valid ProvisionTenantRequest request) {
        return service.provision(request.name());
    }

    @PatchMapping("/{tenantId}/plan")
    @PreAuthorize("@permissionGuard.has(authentication, 'TENANT_CONFIG')")
    public Map<String, Object> updatePlan(@PathVariable UUID tenantId,
                                         @RequestBody @Valid UpdateTenantPlanRequest request) {
        return service.updatePlan(tenantId, request.plan());
    }

    @PostMapping("/{tenantId}/disable")
    @PreAuthorize("@permissionGuard.has(authentication, 'TENANT_CONFIG')")
    public Map<String, Object> disable(@PathVariable UUID tenantId) {
        return service.disable(tenantId);
    }

    @GetMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'TENANT_CONFIG')")
    public List<Map<String, Object>> list(@RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "50") int size) {
        return service.list(page, size);
    }
}
