package com.smartchain.controller;

import com.smartchain.dto.DomainEventRequest;
import com.smartchain.service.EventLogService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {
    private final EventLogService eventLogService;

    public EventController(EventLogService eventLogService) {
        this.eventLogService = eventLogService;
    }

    @PostMapping
    public Map<String, UUID> append(@RequestBody @Valid DomainEventRequest request) {
        return Map.of("eventId", eventLogService.append(request));
    }
}
