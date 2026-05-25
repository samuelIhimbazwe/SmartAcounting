package com.smartaccounting.controller;

import com.smartaccounting.dto.NotificationEventRequest;
import com.smartaccounting.dto.NotificationRuleRequest;
import com.smartaccounting.dto.PushTokenRequest;
import com.smartaccounting.entity.NotificationEvent;
import com.smartaccounting.entity.NotificationRule;
import com.smartaccounting.entity.NotificationSmsDeliveryLog;
import com.smartaccounting.service.NotificationService;
import com.smartaccounting.service.PushNotificationService;
import com.smartaccounting.tenant.TenantContext;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;
    private final PushNotificationService pushNotificationService;

    public NotificationController(NotificationService service,
                                  PushNotificationService pushNotificationService) {
        this.service = service;
        this.pushNotificationService = pushNotificationService;
    }

    @PostMapping("/push-token")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> registerPushToken(@RequestBody @Valid PushTokenRequest request) {
        UUID tenantId = TenantContext.tenantId();
        UUID userId = TenantContext.userId();
        if (tenantId == null || userId == null) {
            return ResponseEntity.badRequest().build();
        }
        pushNotificationService.registerToken(
            tenantId, userId, request.getToken(), request.getPlatform(), request.getAppVersion());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/rules")
    @PreAuthorize(PermissionExpressions.TENANT_CONFIG)
    public Map<String, UUID> createRule(@RequestBody @Valid NotificationRuleRequest req) {
        return Map.of("ruleId", service.createRule(req));
    }

    @GetMapping("/rules")
    @PreAuthorize(PermissionExpressions.TENANT_CONFIG)
    public List<NotificationRule> rules(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "50") int size) {
        return service.activeRules(page, size);
    }

    @PostMapping("/events")
    @PreAuthorize(PermissionExpressions.TENANT_CONFIG)
    public Map<String, UUID> emit(@RequestBody @Valid NotificationEventRequest req) {
        return Map.of("eventId", service.emit(req));
    }

    @GetMapping("/events")
    @PreAuthorize(PermissionExpressions.TENANT_CONFIG)
    public List<NotificationEvent> events(@RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "50") int size) {
        return service.recentEvents(page, size);
    }

    @GetMapping("/sms-deliveries")
    @PreAuthorize(PermissionExpressions.TENANT_CONFIG)
    public List<NotificationSmsDeliveryLog> smsDeliveries(@RequestParam(required = false) UUID eventId,
                                                          @RequestParam(defaultValue = "0") int page,
                                                          @RequestParam(defaultValue = "50") int size) {
        return service.recentSmsDeliveries(eventId, page, size);
    }

    @GetMapping("/sms-deliveries/export")
    @PreAuthorize(PermissionExpressions.TENANT_CONFIG)
    public ResponseEntity<byte[]> exportSmsDeliveries(@RequestParam(required = false) UUID eventId,
                                                      @RequestParam(required = false) String status,
                                                      @RequestParam(required = false) String phone,
                                                      @RequestParam(defaultValue = "5000") int limit) {
        String csv = service.smsDeliveriesCsv(eventId, status, phone, limit);
        String filename = "sms-deliveries.csv";
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/csv"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .body(csv.getBytes(StandardCharsets.UTF_8));
    }
}
