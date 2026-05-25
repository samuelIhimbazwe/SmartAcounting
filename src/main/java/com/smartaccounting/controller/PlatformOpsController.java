package com.smartaccounting.controller;

import com.smartaccounting.dto.CustomFieldValueRequest;
import com.smartaccounting.dto.ScenarioTemplateRequest;
import com.smartaccounting.entity.CustomFieldValue;
import com.smartaccounting.entity.ScenarioTemplate;
import com.smartaccounting.service.PlatformOpsService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/platform")
public class PlatformOpsController {
    private final PlatformOpsService service;

    public PlatformOpsController(PlatformOpsService service) {
        this.service = service;
    }

    @PostMapping("/custom-fields/values")
    @PreAuthorize(PermissionExpressions.OPS_DASHBOARD)
    public Map<String, UUID> setCustomField(@RequestBody @Valid CustomFieldValueRequest req) {
        return Map.of("customFieldValueId", service.upsertCustomField(req));
    }

    @GetMapping("/custom-fields/values/{entityType}/{entityId}")
    @PreAuthorize(PermissionExpressions.OPS_DASHBOARD)
    public List<CustomFieldValue> getCustomFieldValues(@PathVariable String entityType, @PathVariable UUID entityId) {
        return service.values(entityType, entityId);
    }

    @PostMapping("/scenarios")
    @PreAuthorize(PermissionExpressions.TENANT_ADMIN)
    public Map<String, UUID> createScenario(@RequestBody @Valid ScenarioTemplateRequest req) {
        return Map.of("scenarioId", service.createScenario(req));
    }

    @GetMapping("/scenarios/{role}")
    @PreAuthorize("@dashboardAccessGuard.canAccess(authentication, #role)")
    public List<ScenarioTemplate> scenarios(@PathVariable String role) {
        return service.scenarios(role);
    }
}
