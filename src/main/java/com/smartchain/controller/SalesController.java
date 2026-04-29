package com.smartchain.controller;
import com.smartchain.dto.CreateSalesOrderRequest;
import com.smartchain.service.SalesService;
import jakarta.validation.Valid;
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
    @PreAuthorize("hasRole('CEO') or hasRole('SALES_MANAGER')")
    public Map<String, UUID> create(@RequestBody @Valid CreateSalesOrderRequest req) {
        return Map.of("salesOrderId", service.createOrder(req));
    }
}
