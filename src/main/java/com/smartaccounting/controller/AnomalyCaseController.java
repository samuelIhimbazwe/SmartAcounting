package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateAnomalyCaseRequest;
import com.smartaccounting.entity.AnomalyCase;
import com.smartaccounting.service.AnomalyCaseService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/anomaly")
public class AnomalyCaseController {
    private final AnomalyCaseService service;

    public AnomalyCaseController(AnomalyCaseService service) {
        this.service = service;
    }

    @PostMapping("/cases")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('OPS_MANAGER') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> create(@RequestBody @Valid CreateAnomalyCaseRequest request) {
        return Map.of("anomalyCaseId", service.create(request));
    }

    @GetMapping("/cases/{role}")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public List<AnomalyCase> list(@PathVariable String role,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return service.listOpen(role, page, size);
    }

    @PostMapping("/cases/{caseId}/reviewed")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public Map<String, Object> markReviewed(@PathVariable UUID caseId) {
        return service.markReviewed(caseId);
    }

    @PostMapping("/cases/{caseId}/escalate")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public Map<String, Object> escalate(@PathVariable UUID caseId,
                                        @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.get("note") : null;
        return service.escalate(caseId, note);
    }

    @PostMapping("/alerts/reviewed")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public Map<String, Object> reviewAlert(@RequestBody Map<String, Object> alert) {
        return service.reviewAlert(alert);
    }

    @PostMapping("/alerts/escalate")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'OPS_MANAGER', 'ACCOUNTING_CONTROLLER')")
    public Map<String, Object> escalateAlert(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> alert = body.get("alert") instanceof Map<?, ?> m
            ? (Map<String, Object>) m
            : body;
        String note = body.get("note") != null ? String.valueOf(body.get("note")) : null;
        return service.escalateAlert(alert, note);
    }
}
