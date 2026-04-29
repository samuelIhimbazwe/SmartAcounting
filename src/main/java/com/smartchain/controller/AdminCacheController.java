package com.smartchain.controller;

import com.smartchain.dashboard.DashboardCacheService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/cache")
public class AdminCacheController {
    private final DashboardCacheService dashboardCacheService;

    public AdminCacheController(DashboardCacheService dashboardCacheService) {
        this.dashboardCacheService = dashboardCacheService;
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO')")
    public Map<String, Object> stats() {
        return dashboardCacheService.stats();
    }
}
