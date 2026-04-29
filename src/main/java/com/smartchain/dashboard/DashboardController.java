package com.smartchain.dashboard;

import com.smartchain.dto.ActionExecutionRequest;
import com.smartchain.dto.AnomalyDto;
import com.smartchain.dto.ChartPointDto;
import com.smartchain.dto.KpiDto;
import com.smartchain.dto.RecommendedActionDto;
import jakarta.validation.Valid;
import com.smartchain.alerts.SseEventBroadcaster;
import com.smartchain.tenant.TenantContext;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboards")
public class DashboardController {
    private final DashboardService dashboardService;
    private final DashboardCacheService dashboardCacheService;
    private final SseEventBroadcaster sseEventBroadcaster;

    public DashboardController(DashboardService dashboardService,
                               DashboardCacheService dashboardCacheService,
                               SseEventBroadcaster sseEventBroadcaster) {
        this.dashboardService = dashboardService;
        this.dashboardCacheService = dashboardCacheService;
        this.sseEventBroadcaster = sseEventBroadcaster;
    }

    @GetMapping("/{role}/kpis")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public ResponseEntity<List<KpiDto>> kpis(@PathVariable String role) {
        boolean hit = false;
        if (com.smartchain.tenant.TenantContext.tenantId() != null) {
            hit = dashboardCacheService.getKpis(com.smartchain.tenant.TenantContext.tenantId(), role.toLowerCase(), "default").isPresent();
        }
        List<KpiDto> body = dashboardService.kpis(role);
        return ResponseEntity.ok().header("X-Cache", hit ? "HIT" : "MISS").body(body);
    }

    @GetMapping("/{role}/charts/{widget}")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public List<ChartPointDto> chart(@PathVariable String role, @PathVariable String widget) {
        return dashboardService.chart(role, widget);
    }

    @GetMapping("/{role}/charts/{widget}/drilldown")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public Map<String, Object> drilldown(@PathVariable String role,
                                         @PathVariable String widget,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "25") int size,
                                         @RequestParam(required = false) LocalDate from,
                                         @RequestParam(required = false) LocalDate to) {
        return dashboardService.chartDrilldown(role, widget, page, size, from, to);
    }

    @GetMapping("/{role}/anomalies")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public List<AnomalyDto> anomalies(@PathVariable String role) {
        return dashboardService.anomalies(role);
    }

    @GetMapping("/{role}/alerts")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public List<String> alerts(@PathVariable String role) {
        return dashboardService.alerts(role);
    }

    @GetMapping("/{role}/actions")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public List<RecommendedActionDto> actions(@PathVariable String role) {
        return dashboardService.actions(role);
    }

    @PostMapping("/actions/{type}")
    public Map<String, String> executeAction(@PathVariable String type, @RequestBody @Valid ActionExecutionRequest request) {
        return Map.of("status", dashboardService.executeAction(type, request.actionId()));
    }

    @GetMapping(value = "/{role}/alerts/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public SseEmitter alertsStream(@PathVariable String role) throws IOException {
        if (TenantContext.tenantId() == null || TenantContext.userId() == null) {
            throw new IllegalStateException("Tenant/user context required for SSE");
        }
        SseEmitter emitter = sseEventBroadcaster.register(TenantContext.tenantId(), TenantContext.userId(), role);
        emitter.send(SseEmitter.event()
            .name("alert")
            .data(Map.of("role", role, "message", "Connected to SmartChain alert stream", "ts", Instant.now().toString())));
        return emitter;
    }
}
