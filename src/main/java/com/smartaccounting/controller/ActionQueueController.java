package com.smartaccounting.controller;

import com.smartaccounting.dto.EnqueueActionRequest;
import com.smartaccounting.entity.ActionQueueItem;
import com.smartaccounting.service.ActionQueueService;
import jakarta.validation.Valid;
import com.smartaccounting.security.PermissionExpressions;
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
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public Map<String, UUID> enqueue(@RequestBody @Valid EnqueueActionRequest req) {
        return Map.of("actionId", service.enqueue(req.actionType(), req.actionRef(), req.payloadJson()));
    }

    @GetMapping("/queue")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public List<ActionQueueItem> queued(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "50") int size) {
        return service.queued(page, size);
    }

    @PostMapping("/process")
    @PreAuthorize(PermissionExpressions.FINANCE_READ)
    public Map<String, Integer> process() {
        return Map.of("processed", service.processBatch());
    }
}
