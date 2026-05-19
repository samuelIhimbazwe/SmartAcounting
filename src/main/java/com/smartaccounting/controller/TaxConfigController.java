package com.smartaccounting.controller;

import com.smartaccounting.service.TaxConfigService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/tax-configs")
public class TaxConfigController {
    private final TaxConfigService taxConfigService;

    public TaxConfigController(TaxConfigService taxConfigService) {
        this.taxConfigService = taxConfigService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPS_MANAGER','SALES_MANAGER','ACCOUNTING_CONTROLLER','CFO','CEO')")
    public List<Map<String, Object>> list() {
        return taxConfigService.listActive();
    }
}
