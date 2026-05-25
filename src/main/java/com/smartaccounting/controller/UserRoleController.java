package com.smartaccounting.controller;

import com.smartaccounting.dto.rbac.AssignRoleRequest;
import com.smartaccounting.dto.rbac.RoleResponse;
import com.smartaccounting.service.UserRoleAssignmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenant/users/{userId}/roles")
public class UserRoleController {
    private final UserRoleAssignmentService userRoleAssignmentService;

    public UserRoleController(UserRoleAssignmentService userRoleAssignmentService) {
        this.userRoleAssignmentService = userRoleAssignmentService;
    }

    @PostMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'USER_MANAGE')")
    public void assignRole(@PathVariable UUID userId, @RequestBody @Valid AssignRoleRequest request) {
        userRoleAssignmentService.assignRole(userId, request.roleId());
    }

    @DeleteMapping("/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@permissionGuard.has(authentication, 'USER_MANAGE')")
    public void removeRole(@PathVariable UUID userId, @PathVariable UUID roleId) {
        userRoleAssignmentService.removeRole(userId, roleId);
    }

    @GetMapping
    @PreAuthorize("@permissionGuard.has(authentication, 'USER_MANAGE') or @userRoleAccessGuard.isSelf(#userId)")
    public List<RoleResponse> listUserRoles(@PathVariable UUID userId) {
        return userRoleAssignmentService.listUserRoles(userId);
    }
}
