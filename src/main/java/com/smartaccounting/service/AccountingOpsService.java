package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreatePaymentRequest;
import com.smartaccounting.dto.CreateReconciliationRequest;
import com.smartaccounting.entity.Payment;
import com.smartaccounting.entity.Reconciliation;
import com.smartaccounting.events.DomainEventPublisher;
import com.smartaccounting.repository.PaymentRepository;
import com.smartaccounting.repository.ReconciliationRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class AccountingOpsService {
    private final PaymentRepository paymentRepository;
    private final ReconciliationRepository reconciliationRepository;
    private final AuditService auditService;
    private final DomainEventPublisher eventPublisher;

    public AccountingOpsService(PaymentRepository paymentRepository,
                                ReconciliationRepository reconciliationRepository,
                                AuditService auditService,
                                DomainEventPublisher eventPublisher) {
        this.paymentRepository = paymentRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.auditService = auditService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public UUID createPayment(CreatePaymentRequest request) {
        UUID tenant = requireTenant();
        Payment p = new Payment();
        p.setId(UUID.randomUUID());
        p.setTenantId(tenant);
        p.setDirection(request.direction().toUpperCase());
        p.setCounterparty(request.counterparty());
        p.setAmount(request.amount());
        p.setCurrencyCode(request.currencyCode());
        p.setStatus("POSTED");
        p.setCreatedAt(Instant.now());
        paymentRepository.save(p);
        eventPublisher.publish("finance.events", "PAYMENT_POSTED", Map.of("tenantId", tenant.toString(), "paymentId", p.getId().toString()));
        auditService.logAction("PAYMENT_POSTED", "PAYMENT", "{}", "{\"id\":\"" + p.getId() + "\"}");
        return p.getId();
    }

    @Transactional
    public UUID createReconciliation(CreateReconciliationRequest request) {
        UUID tenant = requireTenant();
        Reconciliation r = new Reconciliation();
        r.setId(UUID.randomUUID());
        r.setTenantId(tenant);
        r.setAccountCode(request.accountCode());
        r.setPeriod(request.period());
        r.setVarianceAmount(request.varianceAmount());
        r.setStatus(request.varianceAmount().signum() == 0 ? "RECONCILED" : "OPEN_ITEMS");
        r.setCreatedAt(Instant.now());
        reconciliationRepository.save(r);
        eventPublisher.publish("finance.events", "RECONCILIATION_CREATED", Map.of("tenantId", tenant.toString(), "reconciliationId", r.getId().toString()));
        auditService.logAction("RECONCILIATION_CREATED", "RECONCILIATION", "{}", "{\"id\":\"" + r.getId() + "\"}");
        return r.getId();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
