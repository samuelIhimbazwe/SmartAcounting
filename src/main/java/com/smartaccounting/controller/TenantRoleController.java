package com.smartaccounting.controller;

import com.smartaccounting.dto.rbac.CreateRoleRequest;
import com.smartaccounting.dto.rbac.DesignRoleRequest;
import com.smartaccounting.dto.rbac.PermissionCategoryGroup;
import com.smartaccounting.dto.rbac.PermissionResponse;
import com.smartaccounting.dto.rbac.ReplaceRolePermissionsRequest;
import com.smartaccounting.dto.rbac.RoleDesignSuggestionResponse;
import com.smartaccounting.dto.rbac.RoleResponse;
import com.smartaccounting.dto.rbac.TenantSetupRequest;
import com.smartaccounting.dto.rbac.UpdateCustomPermissionGrantsRequest;
import com.smartaccounting.dto.rbac.UpdateRoleRequest;
import com.smartaccounting.entity.BusinessSize;
import com.smartaccounting.entity.BusinessType;
import com.smartaccounting.service.RoleDesignAssistantService;
import com.smartaccounting.service.TenantOnboardingService;
import com.smartaccounting.service.TenantCustomPermissionService;
import com.smartaccounting.service.TenantRoleService;
import com.smartaccounting.service.rbac.RoleTemplate;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenant/roles")
public class TenantRoleController {
    private final TenantRoleService tenantRoleService;
    private final TenantOnboardingService tenantOnboardingService;
    private final RoleDesignAssistantService roleDesignAssistantService;
    private final TenantCustomPermissionService tenantCustomPermissionService;

    public TenantRoleController(
        TenantRoleService tenantRoleService,
        TenantOnboardingService tenantOnboardingService,
        RoleDesignAssistantService roleDesignAssistantService,
        TenantCustomPermissionService tenantCustomPermissionService
    ) {
        this.tenantRoleService = tenantRoleService;
        this.tenantOnboardingService = tenantOnboardingService;
        this.roleDesignAssistantService = roleDesignAssistantService;
        this.tenantCustomPermissionService = tenantCustomPermissionService;
    }

    @GetMapping
    @PreAuthorize("@permissionGuard.hasAny(authentication, 'USER_MANAGE', 'ROLE_MANAGE')")
    public List<RoleResponse> listRoles() {
        return tenantRoleService.listRoles();
    }

    @GetMapping("/permissions")
    @PreAuthorize("isAuthenticated()")
    public List<PermissionCategoryGroup> listPermissions() {
        return tenantRoleService.listPermissionsByCategory();
    }

    @PutMapping("/permissions/{permissionCode}/grants")
    @PreAuthorize("@permissionGuard.has(authentication, 'ROLE_MANAGE')")
    public PermissionResponse updateCustomPermissionGrants(
        @PathVariable String permissionCode,
        @RequestBody @Valid UpdateCustomPermissionGrantsRequest request
    ) {
        return tenantCustomPermissionService.updateGrants(
            TenantContext.tenantId(),
            permissionCode,
            request.grantsPlatformCodes()
        );
    }

    @PostMapping("/design-assistant")
    @PreAuthorize("@permissionGuard.has(authentication, 'ROLE_MANAGE')")
    public RoleDesignSuggestionResponse designRole(@RequestBody @Valid DesignRoleRequest request) {
        return roleDesignAssistantService.design(TenantContext.tenantId(), request);
    }

    @GetMapping("/setup/recommendation")
    @PreAuthorize("isAuthenticated()")
    public List<RoleTemplate> getRecommendation(
        @RequestParam BusinessSize size,
        @RequestParam BusinessType type
    ) {
        return tenantOnboardingService.getRecommendation(TenantContext.tenantId(), size, type);
    }

    @PostMapping("/setup")
    @PreAuthorize("@permissionGuard.has(authentication, 'ROLE_MANAGE') or @permissionGuard.isSelfServiceOwner(authentication)")
    public List<RoleResponse> saveSetup(@RequestBody @Valid TenantSetupRequest request) {
        return tenantOnboardingService.saveSetup(TenantContext.tenantId(), request);
    }

    @GetMapping("/{roleId}")
    @PreAuthorize("@permissionGuard.hasAny(authentication, 'USER_MANAGE', 'ROLE_MANAGE')")
    public RoleResponse getRole(@PathVariable UUID roleId) {
        return tenantRoleService.getRole(roleId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionGuard.has(authentication, 'ROLE_MANAGE')")
    public RoleResponse createRole(@RequestBody @Valid CreateRoleRequest request) {
        return tenantRoleService.createRole(request);
    }

    @PutMapping("/{roleId}")
    @PreAuthorize("@permissionGuard.has(authentication, 'ROLE_MANAGE')")
    public RoleResponse updateRole(@PathVariable UUID roleId, @RequestBody @Valid UpdateRoleRequest request) {
        return tenantRoleService.updateRole(roleId, request);
    }

    @DeleteMapping("/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@permissionGuard.has(authentication, 'ROLE_MANAGE')")
    public void deleteRole(@PathVariable UUID roleId) {
        tenantRoleService.deleteRole(roleId);
    }

    @PostMapping("/{roleId}/permissions")
    @PreAuthorize("@permissionGuard.has(authentication, 'ROLE_MANAGE')")
    public RoleResponse replacePermissions(
        @PathVariable UUID roleId,
        @RequestBody @Valid ReplaceRolePermissionsRequest request
    ) {
        return tenantRoleService.replacePermissions(roleId, request.permissionCodes());
    }
}
