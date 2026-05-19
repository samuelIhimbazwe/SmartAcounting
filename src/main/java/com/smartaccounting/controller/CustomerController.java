package com.smartaccounting.controller;

import com.smartaccounting.dto.CustomerPaymentRequest;
import com.smartaccounting.dto.LoyaltyTransactionRequest;
import com.smartaccounting.dto.UpsertCustomerRequest;
import com.smartaccounting.service.CustomerRetailService;
import com.smartaccounting.service.PriceListService;
import jakarta.validation.Valid;
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
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public List<Map<String, Object>> search(@RequestParam(required = false) String q) {
        return customerService.search(q);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public Map<String, Object> get(@PathVariable UUID id) {
        return customerService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public Map<String, Object> create(@RequestBody @Valid UpsertCustomerRequest request) {
        return customerService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public Map<String, Object> update(@PathVariable UUID id, @RequestBody @Valid UpsertCustomerRequest request) {
        return customerService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public Map<String, String> delete(@PathVariable UUID id) {
        customerService.softDelete(id);
        return Map.of("status", "deleted");
    }

    @GetMapping("/{id}/sales")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public List<Map<String, Object>> sales(@PathVariable UUID id) {
        return customerService.purchaseHistory(id);
    }

    @GetMapping("/{id}/credit-statement")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public List<Map<String, Object>> creditStatement(@PathVariable UUID id) {
        return customerService.creditStatement(id);
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','ACCOUNTING_CONTROLLER')")
    public Map<String, Object> payment(@PathVariable UUID id, @RequestBody @Valid CustomerPaymentRequest request) {
        return customerService.recordPayment(id, request);
    }

    @GetMapping("/{id}/loyalty-transactions")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public List<Map<String, Object>> loyalty(@PathVariable UUID id) {
        return customerService.loyaltyTransactions(id);
    }

    @PostMapping("/{id}/loyalty-transactions")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public Map<String, Object> loyaltyPost(@PathVariable UUID id, @RequestBody @Valid LoyaltyTransactionRequest request) {
        return customerService.postLoyaltyTransaction(id, request);
    }

}
