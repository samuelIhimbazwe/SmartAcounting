package com.smartaccounting.controller;
import com.smartaccounting.dto.CreateSalesOrderRequest;
import com.smartaccounting.service.SalesService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sales")
public class SalesController {
    private final SalesService service;
    public SalesController(SalesService service) { this.service = service; }
    @PostMapping("/orders")
    @PreAuthorize(PermissionExpressions.POS_ACCESS)
    public Map<String, UUID> create(@RequestBody @Valid CreateSalesOrderRequest req) {
        return Map.of("salesOrderId", service.createOrder(req));
    }
}
