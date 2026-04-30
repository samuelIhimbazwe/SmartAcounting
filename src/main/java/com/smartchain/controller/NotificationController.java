package com.smartchain.controller;

import com.smartchain.dto.NotificationEventRequest;
import com.smartchain.dto.NotificationRuleRequest;
import com.smartchain.entity.NotificationEvent;
import com.smartchain.entity.NotificationRule;
import com.smartchain.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @PostMapping("/rules")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> createRule(@RequestBody @Valid NotificationRuleRequest req) {
        return Map.of("ruleId", service.createRule(req));
    }

    @GetMapping("/rules")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public List<NotificationRule> rules(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "50") int size) {
        return service.activeRules(page, size);
    }

    @PostMapping("/events")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> emit(@RequestBody @Valid NotificationEventRequest req) {
        return Map.of("eventId", service.emit(req));
    }

    @GetMapping("/events")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public List<NotificationEvent> events(@RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "50") int size) {
        return service.recentEvents(page, size);
    }
}
