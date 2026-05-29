package com.smartaccounting.controller;

import com.smartaccounting.dto.CreateStockTransferRequest;
import com.smartaccounting.dto.ReceiveStockTransferRequest;
import com.smartaccounting.service.StockTransferService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock/transfers")
public class StockTransferController {
    private final StockTransferService stockTransferService;

    public StockTransferController(StockTransferService stockTransferService) {
        this.stockTransferService = stockTransferService;
    }

    @PostMapping
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public ResponseEntity<Map<String, Object>> create(
        @Valid @RequestBody CreateStockTransferRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stockTransferService.create(req));
    }

    @GetMapping
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public List<Map<String, Object>> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) UUID locationId,
        @RequestParam(required = false) UUID productId
    ) {
        return stockTransferService.list(status, locationId, productId);
    }

    @GetMapping("/incoming")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public List<Map<String, Object>> incoming() {
        return stockTransferService.listIncoming();
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, Object> approve(@PathVariable UUID id) {
        return stockTransferService.approve(id);
    }

    @PostMapping("/{id}/dispatch")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, Object> dispatch(@PathVariable UUID id) {
        return stockTransferService.dispatch(id);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, Object> reject(@PathVariable UUID id) {
        return stockTransferService.reject(id);
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, Object> receivePost(
        @PathVariable UUID id,
        @Valid @RequestBody ReceiveStockTransferRequest req
    ) {
        return stockTransferService.receive(id, req);
    }

    @PatchMapping("/{id}/receive")
    @PreAuthorize(PermissionExpressions.INVENTORY_WRITE)
    public Map<String, Object> receive(
        @PathVariable UUID id,
        @Valid @RequestBody ReceiveStockTransferRequest req
    ) {
        return stockTransferService.receive(id, req);
    }
}
