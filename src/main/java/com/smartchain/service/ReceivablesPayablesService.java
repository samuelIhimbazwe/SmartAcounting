package com.smartchain.service;

import com.smartchain.audit.AuditService;
import com.smartchain.dto.CreateInvoiceRequest;
import com.smartchain.dto.CreateSupplierBillRequest;
import com.smartchain.entity.Invoice;
import com.smartchain.entity.SupplierBill;
import com.smartchain.repository.InvoiceRepository;
import com.smartchain.repository.SupplierBillRepository;
import com.smartchain.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ReceivablesPayablesService {
    private final InvoiceRepository invoiceRepository;
    private final SupplierBillRepository supplierBillRepository;
    private final AuditService auditService;

    public ReceivablesPayablesService(InvoiceRepository invoiceRepository,
                                      SupplierBillRepository supplierBillRepository,
                                      AuditService auditService) {
        this.invoiceRepository = invoiceRepository;
        this.supplierBillRepository = supplierBillRepository;
        this.auditService = auditService;
    }

    @Transactional
    public UUID createInvoice(CreateInvoiceRequest request) {
        UUID tenantId = requireTenant();
        Invoice invoice = new Invoice();
        invoice.setId(UUID.randomUUID());
        invoice.setTenantId(tenantId);
        invoice.setCustomerName(request.customerName());
        invoice.setAmount(request.amount());
        invoice.setCurrencyCode(request.currencyCode());
        invoice.setDueDate(request.dueDate());
        invoice.setStatus("OPEN");
        invoice.setCreatedAt(Instant.now());
        invoiceRepository.save(invoice);
        auditService.logAction("INVOICE_CREATED", "INVOICE", "{}", "{\"id\":\"" + invoice.getId() + "\"}");
        return invoice.getId();
    }

    @Transactional
    public UUID createSupplierBill(CreateSupplierBillRequest request) {
        UUID tenantId = requireTenant();
        SupplierBill bill = new SupplierBill();
        bill.setId(UUID.randomUUID());
        bill.setTenantId(tenantId);
        bill.setSupplierName(request.supplierName());
        bill.setAmount(request.amount());
        bill.setCurrencyCode(request.currencyCode());
        bill.setDueDate(request.dueDate());
        bill.setStatus("OPEN");
        bill.setCreatedAt(Instant.now());
        supplierBillRepository.save(bill);
        auditService.logAction("SUPPLIER_BILL_CREATED", "SUPPLIER_BILL", "{}", "{\"id\":\"" + bill.getId() + "\"}");
        return bill.getId();
    }

    @Transactional
    public UUID archiveInvoice(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByIdAndDeletedAtIsNull(invoiceId)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
        invoice.setDeletedAt(Instant.now());
        invoiceRepository.save(invoice);
        auditService.logAction("INVOICE_ARCHIVED", "INVOICE", "{}", "{\"id\":\"" + invoiceId + "\"}");
        return invoice.getId();
    }

    @Transactional
    public UUID archiveSupplierBill(UUID billId) {
        SupplierBill bill = supplierBillRepository.findByIdAndDeletedAtIsNull(billId)
            .orElseThrow(() -> new IllegalArgumentException("Supplier bill not found"));
        bill.setDeletedAt(Instant.now());
        supplierBillRepository.save(bill);
        auditService.logAction("SUPPLIER_BILL_ARCHIVED", "SUPPLIER_BILL", "{}", "{\"id\":\"" + billId + "\"}");
        return bill.getId();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }
}
