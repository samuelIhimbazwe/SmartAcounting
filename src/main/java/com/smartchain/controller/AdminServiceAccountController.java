package com.smartchain.controller;

import com.smartchain.dto.CreateServiceAccountKeyRequest;
import com.smartchain.security.ServiceAccountApiKeyService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/service-accounts")
public class AdminServiceAccountController {
    private final ServiceAccountApiKeyService service;

    public AdminServiceAccountController(ServiceAccountApiKeyService service) {
        this.service = service;
    }

    @PostMapping("/keys")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_SECURITY_WRITE')")
    public Map<String, Object> create(@RequestBody @Valid CreateServiceAccountKeyRequest request) {
        ServiceAccountApiKeyService.CreatedKey created = service.create(
            request.serviceAccountName(),
            request.scopes() == null ? java.util.Set.of() : request.scopes(),
            request.expiresAt()
        );
        return Map.of(
            "id", created.id(),
            "apiKey", created.rawKey(),
            "serviceUserId", created.serviceUserId(),
            "serviceAccountName", created.serviceAccountName(),
            "scopes", created.scopes(),
            "expiresAt", String.valueOf(created.expiresAt())
        );
    }

    @GetMapping("/keys")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_SECURITY_WRITE')")
    public List<Map<String, Object>> list() {
        return service.list();
    }

    @PostMapping("/keys/{id}/revoke")
    @PreAuthorize("@permissionGuard.has(authentication, 'ADMIN_SECURITY_WRITE')")
    public Map<String, Object> revoke(@PathVariable UUID id) {
        return service.revoke(id);
    }
}
