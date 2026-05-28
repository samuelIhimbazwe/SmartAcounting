package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateLayawayRequest;
import com.smartaccounting.dto.CustomerPaymentRequest;
import com.smartaccounting.dto.LayawayPaymentRequest;
import com.smartaccounting.dto.LoyaltyTransactionRequest;
import com.smartaccounting.dto.UpsertCustomerRequest;
import com.smartaccounting.service.CustomerRetailService;
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
    public List<Map<String, Object>> search(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String search) {
        String term = q != null && !q.isBlank() ? q : search;
        return customerService.search(term);
    }

    @GetMapping("/price-list-options")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public List<Map<String, Object>> priceListOptions() {
        return customerService.priceListOptions();
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

    @GetMapping({"/{id}/credit", "/{id}/credit-statement"})
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

    @GetMapping("/{id}/layaways")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public List<Map<String, Object>> layaways(
        @PathVariable UUID id,
        @RequestParam(required = false) String status) {
        return customerService.listLayaways(id, status);
    }

    @PostMapping("/{id}/layaways")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> createLayaway(
        @PathVariable UUID id,
        @RequestBody @Valid CreateLayawayRequest request) {
        return customerService.createLayaway(id, request);
    }

    @PostMapping("/{customerId}/layaways/{layawayId}/payments")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> layawayPayment(
        @PathVariable UUID customerId,
        @PathVariable UUID layawayId,
        @RequestBody @Valid LayawayPaymentRequest request) {
        return customerService.recordLayawayPayment(customerId, layawayId, request);
    }

    @PostMapping("/{customerId}/layaways/{layawayId}/collect")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> layawayCollect(
        @PathVariable UUID customerId,
        @PathVariable UUID layawayId) {
        return customerService.collectLayaway(customerId, layawayId);
    }

    @PostMapping("/{customerId}/layaways/{layawayId}/cancel")
    @PreAuthorize(PermissionExpressions.CUSTOMER_ACCESS)
    public Map<String, Object> layawayCancel(
        @PathVariable UUID customerId,
        @PathVariable UUID layawayId) {
        return customerService.cancelLayaway(customerId, layawayId);
    }
}
