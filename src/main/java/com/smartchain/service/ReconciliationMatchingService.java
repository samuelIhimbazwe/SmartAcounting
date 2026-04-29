package com.smartchain.service;

import com.smartchain.audit.AuditService;
import com.smartchain.entity.Invoice;
import com.smartchain.entity.Payment;
import com.smartchain.entity.ReconciliationMatchItem;
import com.smartchain.entity.SupplierBill;
import com.smartchain.repository.InvoiceRepository;
import com.smartchain.repository.PaymentRepository;
import com.smartchain.repository.ReconciliationMatchItemRepository;
import com.smartchain.repository.SupplierBillRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class ReconciliationMatchingService {
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final ReconciliationMatchItemRepository matchItemRepository;
    private final AuditService auditService;

    public ReconciliationMatchingService(PaymentRepository paymentRepository,
                                         InvoiceRepository invoiceRepository,
                                         SupplierBillRepository supplierBillRepository,
                                         ReconciliationMatchItemRepository matchItemRepository,
                                         AuditService auditService) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.matchItemRepository = matchItemRepository;
        this.auditService = auditService;
    }

    @Transactional
    public int autoMatch() {
        requireTenant();
        List<Payment> payments = paymentRepository.findAll();
        List<Invoice> invoices = invoiceRepository.findAllByDeletedAtIsNull();
        int matchedCount = 0;
        for (Payment p : payments) {
            if (!"POSTED".equals(p.getStatus()) && !"PARTIALLY_APPLIED".equals(p.getStatus())) continue;
            Optional<Invoice> match = invoices.stream()
                .filter(i -> !"PAID".equals(i.getStatus()))
                .filter(i -> i.getCurrencyCode().equalsIgnoreCase(p.getCurrencyCode()))
                .filter(i -> i.getAmount().compareTo(p.getAmount()) == 0)
                .findFirst();
            if (match.isPresent()) {
                Invoice inv = match.get();
                inv.setStatus("PAID");
                p.setStatus("FULLY_APPLIED");
                invoiceRepository.save(inv);
                paymentRepository.save(p);
                registerMatch("PAYMENT", p.getId(), p.getAmount(), "AUTO-" + p.getId());
                registerMatch("INVOICE", inv.getId(), inv.getAmount(), "AUTO-" + p.getId());
                matchedCount += 2;
            }
        }

        for (SupplierBill bill : supplierBillRepository.findAllByDeletedAtIsNull()) {
            if (!"PAID".equals(bill.getStatus()) && bill.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                registerUnmatched("SUPPLIER_BILL", bill.getId(), bill.getAmount());
            }
        }
        for (Invoice inv : invoices) {
            if (!"PAID".equals(inv.getStatus()) && inv.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                registerUnmatched("INVOICE", inv.getId(), inv.getAmount());
            }
        }
        auditService.logAction("RECON_AUTO_MATCH", "RECON_MATCH", "{}", "{\"matched\":" + matchedCount + "}");
        return matchedCount;
    }

    @Transactional(readOnly = true)
    public List<ReconciliationMatchItem> unmatchedQueue() {
        return matchItemRepository.findTop100ByMatchedFalseOrderByCreatedAtAsc();
    }

    @Transactional(readOnly = true)
    public List<ReconciliationMatchItem> unmatchedQueue(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(200, Math.max(1, size));
        return matchItemRepository.findByMatchedFalseOrderByCreatedAtAsc(PageRequest.of(safePage, safeSize));
    }

    private void registerMatch(String type, UUID id, BigDecimal amount, String group) {
        ReconciliationMatchItem item = new ReconciliationMatchItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(TenantContext.tenantId());
        item.setItemType(type);
        item.setItemId(id);
        item.setAmount(amount);
        item.setMatched(true);
        item.setMatchGroup(group);
        item.setCreatedAt(Instant.now());
        matchItemRepository.save(item);
    }

    private void registerUnmatched(String type, UUID id, BigDecimal amount) {
        boolean exists = matchItemRepository.findTop100ByMatchedFalseOrderByCreatedAtAsc().stream()
            .anyMatch(x -> type.equals(x.getItemType()) && id.equals(x.getItemId()));
        if (exists) return;
        ReconciliationMatchItem item = new ReconciliationMatchItem();
        item.setId(UUID.randomUUID());
        item.setTenantId(TenantContext.tenantId());
        item.setItemType(type);
        item.setItemId(id);
        item.setAmount(amount);
        item.setMatched(false);
        item.setCreatedAt(Instant.now());
        matchItemRepository.save(item);
    }

    private void requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
    }
}
