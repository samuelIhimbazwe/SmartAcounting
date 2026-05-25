package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateTaxProfileRequest;
import com.smartaccounting.dto.TaxCalculationRequest;
import com.smartaccounting.service.TaxService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tax")
public class TaxController {
    private final TaxService service;

    public TaxController(TaxService service) {
        this.service = service;
    }

    @PostMapping("/profiles")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public Map<String, UUID> createProfile(@RequestBody @Valid CreateTaxProfileRequest req) {
        return Map.of("taxProfileId", service.createProfile(req));
    }

    @PostMapping("/calculate")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public Map<String, Object> calculate(@RequestBody @Valid TaxCalculationRequest req) {
        return service.calculate(req);
    }
}
