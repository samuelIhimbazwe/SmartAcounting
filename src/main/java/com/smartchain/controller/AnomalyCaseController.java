package com.smartchain.controller;

import com.smartchain.dto.CreateAnomalyCaseRequest;
import com.smartchain.entity.AnomalyCase;
import com.smartchain.service.AnomalyCaseService;
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
}
