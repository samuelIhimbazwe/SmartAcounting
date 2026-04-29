package com.smartchain.controller;

import com.smartchain.dto.CreateTaxProfileRequest;
import com.smartchain.dto.TaxCalculationRequest;
import com.smartchain.service.TaxService;
import jakarta.validation.Valid;
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
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> createProfile(@RequestBody @Valid CreateTaxProfileRequest req) {
        return Map.of("taxProfileId", service.createProfile(req));
    }

    @PostMapping("/calculate")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, Object> calculate(@RequestBody @Valid TaxCalculationRequest req) {
        return service.calculate(req);
    }
}
