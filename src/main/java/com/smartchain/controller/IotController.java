package com.smartchain.controller;
import com.smartchain.dto.DeviceEventRequest;
import com.smartchain.service.IotService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/iot")
public class IotController {
    private final IotService service;
    public IotController(IotService service) { this.service = service; }
    @PostMapping("/events")
    @PreAuthorize("hasRole('CEO') or hasRole('OPS_MANAGER')")
    public Map<String, UUID> ingest(@RequestBody @Valid DeviceEventRequest req) {
        return Map.of("eventId", service.ingest(req));
    }
}
