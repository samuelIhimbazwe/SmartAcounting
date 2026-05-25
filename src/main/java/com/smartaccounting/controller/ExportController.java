package com.smartaccounting.controller;

import com.smartaccounting.dto.ExportRequest;
import com.smartaccounting.service.ExportService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/dashboards")
public class ExportController {
    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @PostMapping("/{role}/export")
    @PreAuthorize("@dashboardAccessGuard.canAccess(authentication, #role)")
    public Map<String, UUID> export(@PathVariable String role, @RequestBody @Valid ExportRequest request) {
        return Map.of("exportJobId", exportService.queue(new ExportRequest(role, request.format())));
    }

    @GetMapping("/export/jobs/{id}")
    @PreAuthorize(PermissionExpressions.REPORTS_EXPORT)
    public Map<String, Object> exportStatus(@PathVariable UUID id) {
        return exportService.status(id);
    }
}
