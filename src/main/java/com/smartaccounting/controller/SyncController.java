package com.smartaccounting.controller;

import com.smartaccounting.dto.SyncOperationRequest;
import com.smartaccounting.service.SyncService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
    public Map<String, Object> queue(@RequestBody @Valid List<SyncOperationRequest> requests) {
        return syncService.enqueueBatch(requests);
    }

    @PostMapping("/flush")
    @PreAuthorize("hasRole('CEO') or hasRole('OPS_MANAGER')")
    public Map<String, Integer> flush() {
        return Map.of("processed", syncService.flushPending());
    }
}
