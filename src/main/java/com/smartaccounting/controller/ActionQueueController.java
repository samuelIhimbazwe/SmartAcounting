package com.smartaccounting.controller;

import com.smartaccounting.dto.EnqueueActionRequest;
import com.smartaccounting.entity.ActionQueueItem;
import com.smartaccounting.service.ActionQueueService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/actions")
public class ActionQueueController {
    private final ActionQueueService service;

    public ActionQueueController(ActionQueueService service) {
        this.service = service;
    }

    @PostMapping("/queue")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, UUID> enqueue(@RequestBody @Valid EnqueueActionRequest req) {
        return Map.of("actionId", service.enqueue(req.actionType(), req.actionRef(), req.payloadJson()));
    }

    @GetMapping("/queue")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public List<ActionQueueItem> queued(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "50") int size) {
        return service.queued(page, size);
    }

    @PostMapping("/process")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO') or hasRole('ACCOUNTING_CONTROLLER')")
    public Map<String, Integer> process() {
        return Map.of("processed", service.processBatch());
    }
}
