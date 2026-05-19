package com.smartaccounting.controller;

import com.smartaccounting.service.PriceListService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/price-lists")
public class PriceListController {
    private final PriceListService priceListService;

    public PriceListController(PriceListService priceListService) {
        this.priceListService = priceListService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CEO','SALES_MANAGER','OPS_MANAGER')")
    public List<Map<String, Object>> list() {
        return priceListService.listPriceLists();
    }
}
