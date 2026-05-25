package com.smartaccounting.controller;

import com.smartaccounting.service.SyncService;
import com.smartaccounting.service.SmsReminderJobService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/jobs")
public class AdminSyncJobsController {
    private final SyncService syncService;
    private final SmsReminderJobService smsReminderJobService;

    public AdminSyncJobsController(SyncService syncService,
                                   SmsReminderJobService smsReminderJobService) {
        this.syncService = syncService;
        this.smsReminderJobService = smsReminderJobService;
    }

    @PostMapping("/sync-flush/run")
    @PreAuthorize("@permissionGuard.has(authentication, 'TENANT_CONFIG')")
    public Map<String, Integer> runSyncFlush() {
        return Map.of("processed", syncService.flushPending());
    }

    @PostMapping("/sms-reminder/run")
    @PreAuthorize("@permissionGuard.has(authentication, 'TENANT_CONFIG')")
    public Map<String, Object> runSmsReminder(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate simulateDate
    ) {
        return smsReminderJobService.run(simulateDate);
    }
}
