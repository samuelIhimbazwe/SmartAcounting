package com.smartaccounting.controller;

import com.smartaccounting.dto.EnqueueActionRequest;
import com.smartaccounting.dto.ProcessActionRequest;
import com.smartaccounting.entity.ActionQueueItem;
import com.smartaccounting.service.ActionHubService;
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
    private final ActionHubService actionHubService;

    public ActionQueueController(ActionQueueService service, ActionHubService actionHubService) {
        this.service = service;
        this.actionHubService = actionHubService;
    }

    @GetMapping
    @PreAuthorize(PermissionExpressions.ANALYTICS_ANY)
    public Map<String, Object> listActions(@RequestParam(defaultValue = "cfo") String role) {
        return actionHubService.listHub(role);
    }

    @PostMapping("/{id}/process")
    @PreAuthorize(PermissionExpressions.ANALYTICS_ANY)
    public Map<String, Object> processAction(@PathVariable String id,
                                             @RequestBody @Valid ProcessActionRequest body,
                                             @RequestParam(defaultValue = "cfo") String role) {
        return actionHubService.processAny(id, body, role);
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
