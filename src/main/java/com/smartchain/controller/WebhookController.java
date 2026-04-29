package com.smartchain.controller;
import com.smartchain.dto.CreateWebhookSubscriptionRequest;
import com.smartchain.service.WebhookService;
import jakarta.validation.Valid;
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
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> subscribe(@RequestBody @Valid CreateWebhookSubscriptionRequest req) {
        return Map.of("subscriptionId", service.subscribe(req));
    }
}
