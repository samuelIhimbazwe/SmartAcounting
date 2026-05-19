package com.smartaccounting.controller;

import com.smartaccounting.service.AnalyticsDashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsDashboardService analyticsDashboardService;

    public AnalyticsController(AnalyticsDashboardService analyticsDashboardService) {
        this.analyticsDashboardService = analyticsDashboardService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('CEO','CFO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public Map<String, Object> dashboard(
        @RequestParam(defaultValue = "location") String scope
    ) {
        return analyticsDashboardService.dashboard(scope);
    }
}
