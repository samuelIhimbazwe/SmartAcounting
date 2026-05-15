package com.smartaccounting.service;

import com.smartaccounting.audit.AuditService;
import com.smartaccounting.dto.ApplyPaymentRequest;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.entity.Payment;
import com.smartaccounting.entity.PaymentApplication;
import com.smartaccounting.entity.SupplierBill;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.repository.PaymentApplicationRepository;
import com.smartaccounting.repository.PaymentRepository;
import com.smartaccounting.repository.SupplierBillRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentApplicationService {
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final PaymentApplicationRepository applicationRepository;
    private final AuditService auditService;

    public PaymentApplicationService(PaymentRepository paymentRepository,
                                     InvoiceRepository invoiceRepository,
                                     SupplierBillRepository supplierBillRepository,
                                     PaymentApplicationRepository applicationRepository,
                                     AuditService auditService) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.applicationRepository = applicationRepository;
        this.auditService = auditService;
    }

    @Transactional
    public UUID apply(ApplyPaymentRequest req) {
        UUID tenant = requireTenant();
        Payment payment = paymentRepository.findById(req.paymentId())
            .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        if (!tenant.equals(payment.getTenantId())) {
            throw new IllegalArgumentException("Payment not found");
        }

        BigDecimal alreadyApplied = applicationRepository.findByTenantIdAndPaymentId(tenant, payment.getId()).stream()
            .map(PaymentApplication::getAppliedAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remaining = payment.getAmount().subtract(alreadyApplied);
        if (req.appliedAmount().compareTo(BigDecimal.ZERO) <= 0 || req.appliedAmount().compareTo(remaining) > 0) {
            throw new IllegalArgumentException("Applied amount exceeds remaining payment balance");
        }

        String targetType = req.targetType().toUpperCase();
        if ("INVOICE".equals(targetType)) {
            Invoice invoice = invoiceRepository.findByIdAndDeletedAtIsNull(req.targetId())
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
            if (!tenant.equals(invoice.getTenantId())) {
                throw new IllegalArgumentException("Invoice not found");
            }
            updateDocumentStatus(
                invoice.getAmount(),
                sumTargetApplied(tenant, "INVOICE", invoice.getId()).add(req.appliedAmount()),
                status -> invoice.setStatus(status)
            );
            invoiceRepository.save(invoice);
        } else if ("SUPPLIER_BILL".equals(targetType)) {
            SupplierBill bill = supplierBillRepository.findByIdAndDeletedAtIsNull(req.targetId())
                .orElseThrow(() -> new IllegalArgumentException("Supplier bill not found"));
            if (!tenant.equals(bill.getTenantId())) {
                throw new IllegalArgumentException("Supplier bill not found");
            }
            updateDocumentStatus(
                bill.getAmount(),
                sumTargetApplied(tenant, "SUPPLIER_BILL", bill.getId()).add(req.appliedAmount()),
                status -> bill.setStatus(status)
            );
            supplierBillRepository.save(bill);
        } else {
            throw new IllegalArgumentException("Unsupported targetType");
        }

        PaymentApplication app = new PaymentApplication();
        app.setId(UUID.randomUUID());
        app.setTenantId(tenant);
        app.setPaymentId(req.paymentId());
        app.setTargetType(targetType);
        app.setTargetId(req.targetId());
        app.setAppliedAmount(req.appliedAmount());
        app.setCreatedAt(Instant.now());
        applicationRepository.save(app);

        BigDecimal newRemaining = remaining.subtract(req.appliedAmount());
        payment.setStatus(newRemaining.compareTo(BigDecimal.ZERO) == 0 ? "FULLY_APPLIED" : "PARTIALLY_APPLIED");
        paymentRepository.save(payment);

        auditService.logAction("PAYMENT_APPLIED", "PAYMENT_APPLICATION", "{}", "{\"id\":\"" + app.getId() + "\"}");
        return app.getId();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listApplications(String targetType, UUID targetId) {
        UUID tenant = requireTenant();
        String normalizedTargetType = targetType == null ? "" : targetType.trim().toUpperCase();
        if (!"INVOICE".equals(normalizedTargetType) && !"SUPPLIER_BILL".equals(normalizedTargetType)) {
            throw new IllegalArgumentException("Unsupported targetType");
        }
        if (targetId == null) {
            throw new IllegalArgumentException("targetId is required");
        }

        List<PaymentApplication> items = applicationRepository
            .findByTenantIdAndTargetTypeAndTargetIdOrderByCreatedAtDesc(tenant, normalizedTargetType, targetId);

        return items.stream().map(item -> {
            Payment payment = paymentRepository.findById(item.getPaymentId())
                .filter(p -> tenant.equals(p.getTenantId()))
                .orElse(null);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("applicationId", item.getId());
            m.put("paymentId", item.getPaymentId());
            m.put("appliedAmount", item.getAppliedAmount());
            m.put("createdAt", item.getCreatedAt());
            if (payment != null) {
                m.put("currencyCode", payment.getCurrencyCode());
                m.put("counterparty", payment.getCounterparty());
                m.put("paymentStatus", payment.getStatus());
            }
            return m;
        }).toList();
    }

    private BigDecimal sumTargetApplied(UUID tenant, String targetType, UUID targetId) {
        List<PaymentApplication> items = applicationRepository.findByTenantIdAndTargetTypeAndTargetId(tenant, targetType, targetId);
        return items.stream().map(PaymentApplication::getAppliedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void updateDocumentStatus(BigDecimal docAmount, BigDecimal applied, java.util.function.Consumer<String> statusSetter) {
        if (applied.compareTo(BigDecimal.ZERO) <= 0) statusSetter.accept("OPEN");
        else if (applied.compareTo(docAmount) < 0) statusSetter.accept("PARTIALLY_PAID");
        else statusSetter.accept("PAID");
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
