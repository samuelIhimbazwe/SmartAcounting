package com.smartaccounting.controller;
import com.smartaccounting.dto.CreateWebhookSubscriptionRequest;
import com.smartaccounting.service.WebhookService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/webhooks")
public class WebhookController {
    private final WebhookService service;
    public WebhookController(WebhookService service) { this.service = service; }
    @PostMapping("/subscriptions")
    @PreAuthorize(PermissionExpressions.TENANT_CONFIG)
    public Map<String, UUID> subscribe(@RequestBody @Valid CreateWebhookSubscriptionRequest req) {
        return Map.of("subscriptionId", service.subscribe(req));
    }
}
