package com.smartaccounting.service;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreatePurchaseOrderRequest;
import com.smartaccounting.entity.PurchaseOrder;
import com.smartaccounting.events.DomainEventPublisher;
import com.smartaccounting.repository.PurchaseOrderRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
public class ProcurementService {
    private final PurchaseOrderRepository repository;
    private final AuditService auditService;
    private final DomainEventPublisher eventPublisher;
    public ProcurementService(PurchaseOrderRepository repository, AuditService auditService, DomainEventPublisher eventPublisher) {
        this.repository = repository; this.auditService = auditService; this.eventPublisher = eventPublisher;
    }
    @Transactional
    public UUID createPo(CreatePurchaseOrderRequest req) {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        PurchaseOrder po = new PurchaseOrder();
        po.setId(UUID.randomUUID());
        po.setTenantId(TenantContext.tenantId());
        po.setSupplierName(req.supplierName());
        po.setStatus("CREATED");
        po.setTotalAmount(req.totalAmount());
        po.setCurrencyCode(req.currencyCode());
        po.setCreatedAt(Instant.now());
        repository.save(po);
        eventPublisher.publish("procurement.events", "PURCHASE_ORDER_CREATED", java.util.Map.of(
            "id", po.getId(), "totalAmount", po.getTotalAmount(), "supplierName", po.getSupplierName()
        ));
        eventPublisher.publish("domain.entity.events", "PURCHASE_ORDER_CREATED", java.util.Map.of(
            "tenantId", po.getTenantId().toString(),
            "id", po.getId().toString(),
            "amount", po.getTotalAmount(),
            "supplierName", po.getSupplierName()
        ));
        auditService.logAction("PURCHASE_ORDER_CREATED", "PURCHASE_ORDER", "{}", "{\"id\":\"" + po.getId() + "\"}");
        return po.getId();
    }
}
