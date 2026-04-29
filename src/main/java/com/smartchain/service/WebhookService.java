package com.smartchain.service;
import com.smartchain.audit.AuditService;
import com.smartchain.dto.CreateWebhookSubscriptionRequest;
import com.smartchain.entity.WebhookSubscription;
import com.smartchain.repository.WebhookSubscriptionRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
public class WebhookService {
    private final WebhookSubscriptionRepository repository;
    private final AuditService auditService;
    public WebhookService(WebhookSubscriptionRepository repository, AuditService auditService) {
        this.repository = repository; this.auditService = auditService;
    }
    @Transactional
    public UUID subscribe(CreateWebhookSubscriptionRequest req) {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        WebhookSubscription sub = new WebhookSubscription();
        sub.setId(UUID.randomUUID());
        sub.setTenantId(TenantContext.tenantId());
        sub.setCallbackUrl(req.callbackUrl());
        sub.setEventType(req.eventType());
        sub.setSecret(req.secret());
        sub.setActive(true);
        sub.setCreatedAt(Instant.now());
        repository.save(sub);
        auditService.logAction("WEBHOOK_SUBSCRIBED", "WEBHOOK", "{}", "{\"id\":\"" + sub.getId() + "\"}");
        return sub.getId();
    }
}
