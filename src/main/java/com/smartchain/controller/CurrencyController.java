package com.smartchain.controller;
import com.smartchain.dto.CreateFxRateRequest;
import com.smartchain.service.CurrencyService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/currency")
public class CurrencyController {
    private final CurrencyService service;
    public CurrencyController(CurrencyService service) { this.service = service; }
    @PostMapping("/rates")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> upsert(@RequestBody @Valid CreateFxRateRequest req) {
        return Map.of("rateId", service.upsertRate(req));
    }
}
