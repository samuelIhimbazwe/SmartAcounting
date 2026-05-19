package com.smartaccounting.controller;

import com.smartaccounting.service.LocationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationController {
    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<Map<String, Object>> listLocations() {
        return locationService.listAccessibleLocations();
    }

    @GetMapping("/{locationId}/registers")
    @PreAuthorize("isAuthenticated()")
    public List<Map<String, Object>> listRegisters(@PathVariable UUID locationId) {
        return locationService.listRegisters(locationId);
    }
}
