package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateInvoiceRequest;
import com.smartaccounting.dto.CreateSupplierBillRequest;
import com.smartaccounting.dto.PatchFinanceCustomerRequest;
import com.smartaccounting.dto.PatchFinanceSupplierRequest;
import com.smartaccounting.dto.SupplierStatementReconciliationRequest;
import com.smartaccounting.service.ReceivablesPayablesService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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

    @GetMapping("/invoices")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_READ')")
    public List<Map<String, Object>> listInvoices(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String customerName
    ) {
        return service.listInvoices(status, customerName);
    }

    @GetMapping("/supplier-bills")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_READ')")
    public List<Map<String, Object>> listSupplierBills(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String supplierName
    ) {
        return service.listSupplierBills(status, supplierName);
    }

    @GetMapping("/customers/{id}/credit-status")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_READ')")
    public Map<String, Object> customerCreditStatus(@PathVariable UUID id) {
        return service.customerCreditStatus(id);
    }

    @GetMapping("/suppliers/{id}/credit-status")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_READ')")
    public Map<String, Object> supplierCreditStatus(@PathVariable UUID id) {
        return service.supplierCreditStatus(id);
    }

    @PatchMapping("/customers/{id}")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> patchCustomer(@PathVariable UUID id, @RequestBody @Valid PatchFinanceCustomerRequest request) {
        return service.patchCustomer(id, request);
    }

    @PatchMapping("/suppliers/{id}")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> patchSupplier(@PathVariable UUID id, @RequestBody @Valid PatchFinanceSupplierRequest request) {
        return service.patchSupplier(id, request);
    }

    @PostMapping("/invoices/{id}/archive")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> archiveInvoice(@PathVariable UUID id) {
        return Map.of("invoiceId", service.archiveInvoice(id));
    }

    @PostMapping("/invoices/{id}/bad-debt")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> writeOffInvoiceBadDebt(@PathVariable UUID id) {
        return service.writeOffInvoiceBadDebt(id);
    }

    @PostMapping("/supplier-bills/{id}/archive")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, UUID> archiveSupplierBill(@PathVariable UUID id) {
        return Map.of("supplierBillId", service.archiveSupplierBill(id));
    }

    @PostMapping("/suppliers/{id}/statement-reconciliation")
    @PreAuthorize("@permissionGuard.has(authentication, 'FINANCE_WRITE')")
    public Map<String, Object> reconcileSupplierStatement(@PathVariable UUID id,
                                                          @RequestBody @Valid SupplierStatementReconciliationRequest request) {
        return service.reconcileSupplierStatement(id, request);
    }
}
