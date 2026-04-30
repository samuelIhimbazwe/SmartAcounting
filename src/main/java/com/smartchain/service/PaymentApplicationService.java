package com.smartchain.service;

import com.smartchain.audit.AuditService;
import com.smartchain.dto.ApplyPaymentRequest;
import com.smartchain.entity.Invoice;
import com.smartchain.entity.Payment;
import com.smartchain.entity.PaymentApplication;
import com.smartchain.entity.SupplierBill;
import com.smartchain.repository.InvoiceRepository;
import com.smartchain.repository.PaymentApplicationRepository;
import com.smartchain.repository.PaymentRepository;
import com.smartchain.repository.SupplierBillRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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
        requireTenant();
        Payment payment = paymentRepository.findById(req.paymentId())
            .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        BigDecimal alreadyApplied = applicationRepository.findByPaymentId(payment.getId()).stream()
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
            updateDocumentStatus(invoice.getAmount(), sumTargetApplied("INVOICE", invoice.getId()).add(req.appliedAmount()), status -> invoice.setStatus(status));
            invoiceRepository.save(invoice);
        } else if ("SUPPLIER_BILL".equals(targetType)) {
            SupplierBill bill = supplierBillRepository.findByIdAndDeletedAtIsNull(req.targetId())
                .orElseThrow(() -> new IllegalArgumentException("Supplier bill not found"));
            updateDocumentStatus(bill.getAmount(), sumTargetApplied("SUPPLIER_BILL", bill.getId()).add(req.appliedAmount()), status -> bill.setStatus(status));
            supplierBillRepository.save(bill);
        } else {
            throw new IllegalArgumentException("Unsupported targetType");
        }

        PaymentApplication app = new PaymentApplication();
        app.setId(UUID.randomUUID());
        app.setTenantId(TenantContext.tenantId());
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

    private BigDecimal sumTargetApplied(String targetType, UUID targetId) {
        List<PaymentApplication> items = applicationRepository.findByTargetTypeAndTargetId(targetType, targetId);
        return items.stream().map(PaymentApplication::getAppliedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void updateDocumentStatus(BigDecimal docAmount, BigDecimal applied, java.util.function.Consumer<String> statusSetter) {
        if (applied.compareTo(BigDecimal.ZERO) <= 0) statusSetter.accept("OPEN");
        else if (applied.compareTo(docAmount) < 0) statusSetter.accept("PARTIALLY_PAID");
        else statusSetter.accept("PAID");
    }

    private void requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
    }
}
