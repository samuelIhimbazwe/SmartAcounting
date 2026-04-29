package com.smartchain.controller;

import com.smartchain.dto.MoveStockRequest;
import com.smartchain.dto.ReceiveStockRequest;
import com.smartchain.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping("/move")
    @PreAuthorize("hasRole('CEO') or hasRole('OPS_MANAGER')")
    public Map<String, UUID> moveStock(@RequestBody @Valid MoveStockRequest request) {
        return Map.of("eventId", inventoryService.moveStock(request));
    }

    @PostMapping("/receive")
    @PreAuthorize("hasRole('CEO') or hasRole('OPS_MANAGER')")
    public Map<String, UUID> receiveStock(@RequestBody @Valid ReceiveStockRequest request) {
        return Map.of("stockMovementId", inventoryService.receiveStock(request));
    }
}
