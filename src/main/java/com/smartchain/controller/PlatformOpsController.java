package com.smartchain.controller;

import com.smartchain.dto.CustomFieldValueRequest;
import com.smartchain.dto.ScenarioTemplateRequest;
import com.smartchain.entity.CustomFieldValue;
import com.smartchain.entity.ScenarioTemplate;
import com.smartchain.service.PlatformOpsService;
import jakarta.validation.Valid;
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
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('OPS_MANAGER') or hasRole('HR_MANAGER') or hasRole('MARKETING_MANAGER') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> setCustomField(@RequestBody @Valid CustomFieldValueRequest req) {
        return Map.of("customFieldValueId", service.upsertCustomField(req));
    }

    @GetMapping("/custom-fields/values/{entityType}/{entityId}")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('OPS_MANAGER') or hasRole('HR_MANAGER') or hasRole('MARKETING_MANAGER') or hasRole('ACCOUNTING_CONTROLLER')")
    public List<CustomFieldValue> getCustomFieldValues(@PathVariable String entityType, @PathVariable UUID entityId) {
        return service.values(entityType, entityId);
    }

    @PostMapping("/scenarios")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO')")
    public Map<String, UUID> createScenario(@RequestBody @Valid ScenarioTemplateRequest req) {
        return Map.of("scenarioId", service.createScenario(req));
    }

    @GetMapping("/scenarios/{role}")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public List<ScenarioTemplate> scenarios(@PathVariable String role) {
        return service.scenarios(role);
    }
}
