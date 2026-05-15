package com.smartaccounting.controller;

import com.smartaccounting.dto.signup.TenantCreateStaffRequest;
import com.smartaccounting.dto.signup.TenantUpgradeRequest;
import com.smartaccounting.dto.signup.TenantUpdateStaffRoleRequest;
import com.smartaccounting.service.TenantSelfServiceService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/v1/tenant")
public class TenantSelfServiceController {

    private final TenantSelfServiceService tenantSelfServiceService;

    public TenantSelfServiceController(TenantSelfServiceService tenantSelfServiceService) {
        this.tenantSelfServiceService = tenantSelfServiceService;
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('CEO','CFO')")
    public Map<String, Object> listUsers(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "50") int size,
                                         @RequestParam(defaultValue = "") String q) {
        return tenantSelfServiceService.listStaff(page, size, q);
    }

    @PostMapping("/users")
    @PreAuthorize("hasAnyRole('CEO','CFO')")
    public Map<String, Object> createUser(@RequestBody @Valid TenantCreateStaffRequest request) {
        return tenantSelfServiceService.createStaff(request);
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAnyRole('CEO','CFO')")
    public void deleteUser(@PathVariable UUID id) {
        tenantSelfServiceService.deleteStaff(id);
    }

    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasAnyRole('CEO','CFO')")
    public Map<String, Object> updateRole(@PathVariable UUID id,
                                          @RequestBody @Valid TenantUpdateStaffRoleRequest request) {
        return tenantSelfServiceService.updateStaffRole(id, request);
    }

    @GetMapping("/billing")
    @PreAuthorize("hasAnyRole('CEO','CFO')")
    public Map<String, Object> billing() {
        return tenantSelfServiceService.billing();
    }

    @PostMapping("/upgrade-request")
    @PreAuthorize("hasAnyRole('CEO','CFO')")
    public void upgradeRequest(@RequestBody @Valid TenantUpgradeRequest request) {
        tenantSelfServiceService.requestUpgrade(request);
    }
}
