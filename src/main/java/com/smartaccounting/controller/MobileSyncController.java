package com.smartaccounting.controller;

import com.smartaccounting.dto.SyncStatusResponse;
import com.smartaccounting.service.MobileSyncService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mobile")
public class MobileSyncController {
    private final MobileSyncService mobileSyncService;

    public MobileSyncController(MobileSyncService mobileSyncService) {
        this.mobileSyncService = mobileSyncService;
    }

    @GetMapping("/sync-status")
    public SyncStatusResponse getSyncStatus() {
        return mobileSyncService.getSyncStatus();
    }
}
