package com.smartaccounting.controller;

import com.smartaccounting.dto.MoveStockRequest;
import com.smartaccounting.dto.ReceiveStockRequest;
import com.smartaccounting.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/balances")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public List<Map<String, Object>> balances(@RequestParam(required = false) String location) {
        return inventoryService.listBalances(location);
    }

    @GetMapping("/batches")
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public List<Map<String, Object>> batches(@RequestParam(required = false) String location) {
        return inventoryService.listBatches(location);
    }

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public List<Map<String, Object>> lowStock(@RequestParam(required = false) String location) {
        return inventoryService.lowStock(location);
    }

    @GetMapping("/expiry-risk")
    @PreAuthorize("hasAnyRole('OPS_MANAGER','ACCOUNTING_CONTROLLER')")
    public List<Map<String, Object>> expiryRisk(@RequestParam(required = false) String location,
                                                @RequestParam(required = false) Integer daysAhead) {
        return inventoryService.expiryRisk(location, daysAhead);
    }

    @PostMapping("/move")
    @PreAuthorize("hasAnyRole('CEO','OPS_MANAGER','SALES_MANAGER','ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> moveStock(@RequestBody @Valid MoveStockRequest request) {
        return Map.of("eventId", inventoryService.moveStock(request));
    }

    @PostMapping("/receive")
    @PreAuthorize("hasAnyRole('CEO','OPS_MANAGER','SALES_MANAGER','ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> receiveStock(@RequestBody @Valid ReceiveStockRequest request) {
        return Map.of("stockMovementId", inventoryService.receiveStock(request));
    }
}
