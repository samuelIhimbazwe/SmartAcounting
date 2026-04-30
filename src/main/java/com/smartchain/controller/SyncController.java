package com.smartchain.controller;

import com.smartchain.dto.SyncOperationRequest;
import com.smartchain.service.SyncService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {
    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping("/queue")
    @PreAuthorize("hasRole('CEO') or hasRole('OPS_MANAGER') or hasRole('SALES_MANAGER')")
    public Map<String, UUID> queue(@RequestBody @Valid SyncOperationRequest request) {
        return Map.of("syncId", syncService.enqueue(request));
    }

    @PostMapping("/flush")
    @PreAuthorize("hasRole('CEO') or hasRole('OPS_MANAGER')")
    public Map<String, Integer> flush() {
        return Map.of("processed", syncService.flushPending());
    }
}
