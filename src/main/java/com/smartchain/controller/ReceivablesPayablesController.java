package com.smartchain.controller;

import com.smartchain.dto.CreateInvoiceRequest;
import com.smartchain.dto.CreateSupplierBillRequest;
import com.smartchain.service.ReceivablesPayablesService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
public class ReceivablesPayablesController {
    private final ReceivablesPayablesService service;

    public ReceivablesPayablesController(ReceivablesPayablesService service) {
        this.service = service;
    }

    @PostMapping("/invoices")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> createInvoice(@RequestBody @Valid CreateInvoiceRequest request) {
        return Map.of("invoiceId", service.createInvoice(request));
    }

    @PostMapping("/supplier-bills")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> createSupplierBill(@RequestBody @Valid CreateSupplierBillRequest request) {
        return Map.of("supplierBillId", service.createSupplierBill(request));
    }

    @PostMapping("/invoices/{id}/archive")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> archiveInvoice(@PathVariable UUID id) {
        return Map.of("invoiceId", service.archiveInvoice(id));
    }

    @PostMapping("/supplier-bills/{id}/archive")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> archiveSupplierBill(@PathVariable UUID id) {
        return Map.of("supplierBillId", service.archiveSupplierBill(id));
    }
}
