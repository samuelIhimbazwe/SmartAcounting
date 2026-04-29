package com.smartchain.controller;

import com.smartchain.entity.ProjectionRebuildJob;
import com.smartchain.service.ProjectionReplayService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/projections")
public class AdminProjectionController {
    private final ProjectionReplayService projectionReplayService;

    public AdminProjectionController(ProjectionReplayService projectionReplayService) {
        this.projectionReplayService = projectionReplayService;
    }

    @PostMapping("/rebuild")
    @PreAuthorize("@permissionGuard.has(authentication, 'PROJECTION_REBUILD')")
    public Map<String, UUID> rebuild(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
                                     @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return Map.of("jobId", projectionReplayService.rebuildAll(from, to));
    }

    @GetMapping("/jobs/{id}")
    @PreAuthorize("@permissionGuard.has(authentication, 'PROJECTION_REBUILD')")
    public ProjectionRebuildJob job(@PathVariable UUID id) {
        return projectionReplayService.get(id);
    }
}
