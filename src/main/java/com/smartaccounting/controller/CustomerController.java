package com.smartaccounting.controller;

import com.smartaccounting.dto.CustomerPaymentRequest;
import com.smartaccounting.dto.LoyaltyTransactionRequest;
import com.smartaccounting.dto.UpsertCustomerRequest;
import com.smartaccounting.service.CustomerRetailService;
import com.smartaccounting.service.PriceListService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {
    private final CustomerRetailService customerService;

    public CustomerController(CustomerRetailService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public List<Map<String, Object>> search(@RequestParam(required = false) String q) {
        return customerService.search(q);
    }

    @GetMapping("/{id}")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> get(@PathVariable UUID id) {
        return customerService.get(id);
    }

    @PostMapping
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> create(@RequestBody @Valid UpsertCustomerRequest request) {
        return customerService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody @Valid UpsertCustomerRequest request) {
        return customerService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, String> delete(@PathVariable UUID id) {
        customerService.softDelete(id);
        return Map.of("status", "deleted");
    }

    @GetMapping("/{id}/sales")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public List<Map<String, Object>> sales(@PathVariable UUID id) {
        return customerService.purchaseHistory(id);
    }

    @GetMapping("/{id}/credit-statement")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public List<Map<String, Object>> creditStatement(@PathVariable UUID id) {
        return customerService.creditStatement(id);
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> payment(@PathVariable UUID id, @RequestBody @Valid CustomerPaymentRequest request) {
        return customerService.recordPayment(id, request);
    }

    @GetMapping("/{id}/loyalty-transactions")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public List<Map<String, Object>> loyalty(@PathVariable UUID id) {
        return customerService.loyaltyTransactions(id);
    }

    @PostMapping("/{id}/loyalty-transactions")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> loyaltyPost(@PathVariable UUID id, @RequestBody @Valid LoyaltyTransactionRequest request) {
        return customerService.postLoyaltyTransaction(id, request);
    }

}
