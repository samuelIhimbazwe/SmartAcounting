package com.smartaccounting.controller;

import com.smartaccounting.dto.InviteTenantUserRequest;
import com.smartaccounting.dto.UpdateTenantUserRoleRequest;
import com.smartaccounting.service.AdminTenantUserService;
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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/tenants/{tenantId}/users")
public class AdminTenantUserController {
    private final AdminTenantUserService service;

    public AdminTenantUserController(AdminTenantUserService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public Map<String, Object> list(@PathVariable UUID tenantId,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size,
                                    @RequestParam(defaultValue = "") String q) {
        return service.listUsers(tenantId, page, size, q);
    }

    @PostMapping("/invites")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public Map<String, Object> invite(@PathVariable UUID tenantId,
                                      @RequestBody @Valid InviteTenantUserRequest request) {
        return service.invite(tenantId, request.email(), request.role());
    }

    @PatchMapping("/{userId}")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_TENANT_WRITE')")
    public Map<String, Object> updateRole(@PathVariable UUID tenantId,
                                          @PathVariable UUID userId,
                                          @RequestBody @Valid UpdateTenantUserRoleRequest request) {
        return service.updateRole(tenantId, userId, request.role());
    }
}
