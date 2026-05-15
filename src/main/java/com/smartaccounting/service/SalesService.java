package com.smartaccounting.service;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.CreateSalesOrderRequest;
import com.smartaccounting.entity.SalesOrder;
import com.smartaccounting.events.DomainEventPublisher;
import com.smartaccounting.repository.SalesOrderRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
public class SalesService {
    private final SalesOrderRepository repository;
    private final AuditService auditService;
    private final DomainEventPublisher eventPublisher;
    public SalesService(SalesOrderRepository repository, AuditService auditService, DomainEventPublisher eventPublisher) {
        this.repository = repository; this.auditService = auditService; this.eventPublisher = eventPublisher;
    }
    @Transactional
    public UUID createOrder(CreateSalesOrderRequest req) {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        SalesOrder order = new SalesOrder();
        order.setId(UUID.randomUUID());
        order.setTenantId(TenantContext.tenantId());
        order.setCustomerName(req.customerName());
        order.setStatus("CONFIRMED");
        order.setTotalAmount(req.totalAmount());
        order.setCurrencyCode(req.currencyCode());
        order.setSalesChannel("DIRECT");
        order.setCreatedAt(Instant.now());
        repository.save(order);
        eventPublisher.publish("sales.events", "SALES_ORDER_CREATED", java.util.Map.of(
            "id", order.getId(), "totalAmount", order.getTotalAmount(), "customerName", order.getCustomerName()
        ));
        eventPublisher.publish("domain.inventory.events", "STOCK_RESERVED", java.util.Map.of(
            "tenantId", order.getTenantId().toString(),
            "salesOrderId", order.getId().toString(),
            "movementType", "RESERVE",
            "timestamp", Instant.now().toString()
        ));
        auditService.logAction("SALES_ORDER_CREATED", "SALES_ORDER", "{}", "{\"id\":\"" + order.getId() + "\"}");
        return order.getId();
    }
}
