package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateFxRateRequest;
import com.smartaccounting.service.CurrencyService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/v1/currency")
public class CurrencyController {
    private final CurrencyService service;

    public CurrencyController(CurrencyService service) {
        this.service = service;
    }

    /**
     * Preview FX conversion for POS totals (same logic as checkout line conversion).
     */
    @GetMapping("/convert")
    @PreAuthorize(
        "hasAnyRole('CEO','CFO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')"
    )
    public Map<String, String> convert(
        @RequestParam @NotBlank String amount,
        @RequestParam @NotBlank String from,
        @RequestParam @NotBlank String to
    ) {
        BigDecimal converted = service.convertAmount(new BigDecimal(amount), from, to);
        return Map.of("amount", converted.setScale(2, RoundingMode.HALF_UP).toPlainString());
    }

    @PostMapping("/rates")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> upsert(@RequestBody @Valid CreateFxRateRequest req) {
        return Map.of("rateId", service.upsertRate(req));
    }
}
