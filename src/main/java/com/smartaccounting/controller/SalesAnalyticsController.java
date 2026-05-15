package com.smartaccounting.controller;

import com.smartaccounting.dto.CashierPerformanceSummary;
import com.smartaccounting.dto.LostSalesSummary;
import com.smartaccounting.entity.HourlySales;
import com.smartaccounting.service.SalesAnalyticsService;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sales/analytics")
public class SalesAnalyticsController {
    private final SalesAnalyticsService salesAnalyticsService;

    public SalesAnalyticsController(SalesAnalyticsService salesAnalyticsService) {
        this.salesAnalyticsService = salesAnalyticsService;
    }

    @GetMapping("/cashier-performance")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'SALES_MANAGER')")
    public ResponseEntity<List<CashierPerformanceSummary>> getCashierPerformance(
        @RequestParam String from,
        @RequestParam String to) {
        return ResponseEntity.ok(salesAnalyticsService.getCashierPerformance(
            TenantContext.tenantId().toString(),
            LocalDate.parse(from),
            LocalDate.parse(to)));
    }

    @GetMapping("/hourly-heatmap")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'SALES_MANAGER', 'OPS_MANAGER')")
    public ResponseEntity<List<HourlySales>> getHourlyHeatmap(
        @RequestParam(required = false) String date) {
        LocalDate d = date != null ? LocalDate.parse(date) : LocalDate.now();
        return ResponseEntity.ok(salesAnalyticsService.getHourlyHeatmap(
            TenantContext.tenantId().toString(), d));
    }

    @GetMapping("/lost-sales")
    @PreAuthorize("hasAnyRole('CEO', 'CFO', 'SALES_MANAGER', 'OPS_MANAGER')")
    public ResponseEntity<LostSalesSummary> getLostSales(
        @RequestParam String from,
        @RequestParam String to) {
        return ResponseEntity.ok(salesAnalyticsService.getLostSalesSummary(
            TenantContext.tenantId().toString(),
            LocalDate.parse(from),
            LocalDate.parse(to)));
    }
}
