package com.smartaccounting.controller;

import com.smartaccounting.dto.UpsertPriceListRequest;
import com.smartaccounting.security.PermissionExpressions;
import com.smartaccounting.service.PriceListService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/price-lists")
public class PriceListController {
    private final PriceListService priceListService;

    public PriceListController(PriceListService priceListService) {
        this.priceListService = priceListService;
    }

    @GetMapping
    @PreAuthorize(PermissionExpressions.POS_ACCESS)
    public List<Map<String, Object>> list() {
        return priceListService.listPriceLists();
    }

    @GetMapping("/{id}")
    @PreAuthorize(PermissionExpressions.POS_ACCESS)
    public Map<String, Object> get(@PathVariable UUID id) {
        return priceListService.getPriceList(id);
    }

    @PostMapping
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody UpsertPriceListRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(priceListService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, Object> update(@PathVariable UUID id, @Valid @RequestBody UpsertPriceListRequest req) {
        return priceListService.update(id, req);
    }

    @PostMapping("/{id}/customers/{customerId}")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, Object> assignCustomer(@PathVariable UUID id, @PathVariable UUID customerId) {
        return priceListService.assignCustomer(id, customerId);
    }

    @DeleteMapping("/{id}/customers/{customerId}")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, Object> unassignCustomer(@PathVariable UUID id, @PathVariable UUID customerId) {
        return priceListService.unassignCustomer(id, customerId);
    }
}
