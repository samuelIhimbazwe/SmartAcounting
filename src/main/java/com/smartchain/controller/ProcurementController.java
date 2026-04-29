package com.smartchain.controller;
import com.smartchain.dto.CreatePurchaseOrderRequest;
import com.smartchain.service.ProcurementService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/procurement")
public class ProcurementController {
    private final ProcurementService service;
    public ProcurementController(ProcurementService service) { this.service = service; }
    @PostMapping("/purchase-orders")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('OPS_MANAGER')")
    public Map<String, UUID> create(@RequestBody @Valid CreatePurchaseOrderRequest req) {
        return Map.of("purchaseOrderId", service.createPo(req));
    }
}
