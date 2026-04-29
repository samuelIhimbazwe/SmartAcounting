package com.smartchain.controller;

import com.smartchain.anomaly.AnomalyService;
import com.smartchain.copilot.CopilotAgentService;
import com.smartchain.copilot.CopilotService;
import com.smartchain.copilot.RagIngestionService;
import com.smartchain.dto.ActionApprovalDecisionRequest;
import com.smartchain.dto.CopilotAgentRunRequest;
import com.smartchain.dto.CopilotQueryRequest;
import com.smartchain.dto.CopilotWhatIfRequest;
import com.smartchain.forecast.ForecastService;
import com.smartchain.service.ActionQueueService;
import com.smartchain.service.ForecastJobService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {
    private final CopilotService copilotService;
    private final CopilotAgentService copilotAgentService;
    private final ForecastService forecastService;
    private final ForecastJobService forecastJobService;
    private final ActionQueueService actionQueueService;
    private final AnomalyService anomalyService;
    private final RagIngestionService ragIngestionService;

    public AiController(CopilotService copilotService,
                        CopilotAgentService copilotAgentService,
                        ForecastService forecastService,
                        ForecastJobService forecastJobService,
                        ActionQueueService actionQueueService,
                        AnomalyService anomalyService,
                        RagIngestionService ragIngestionService) {
        this.copilotService = copilotService;
        this.copilotAgentService = copilotAgentService;
        this.forecastService = forecastService;
        this.forecastJobService = forecastJobService;
        this.actionQueueService = actionQueueService;
        this.anomalyService = anomalyService;
        this.ragIngestionService = ragIngestionService;
    }

    @PostMapping("/copilot/query")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #request.role)")
    public Map<String, Object> copilotQuery(@RequestBody @Valid CopilotQueryRequest request) {
        return copilotService.query(request.role(), request.question());
    }

    @PostMapping(value = "/copilot/query/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #request.role)")
    public SseEmitter copilotQueryStream(@RequestBody @Valid CopilotQueryRequest request) throws IOException {
        SseEmitter emitter = new SseEmitter(30_000L);
        Map<String, Object> response = copilotService.query(request.role(), request.question());
        String answer = String.valueOf(response.getOrDefault("answer", ""));
        for (String token : answer.split(" ")) {
            emitter.send(SseEmitter.event().name("token").data(token + " "));
        }
        emitter.send(SseEmitter.event().name("done").data("complete"));
        emitter.complete();
        return emitter;
    }

    @PostMapping("/copilot/whatif")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #request.role)")
    public Map<String, Object> copilotWhatIf(@RequestBody @Valid CopilotWhatIfRequest request) {
        return copilotService.whatIf(request.role(), request.scenario());
    }

    @PostMapping("/copilot/agent/run")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #request.role)")
    public Map<String, Object> copilotAgentRun(@RequestBody @Valid CopilotAgentRunRequest request) {
        return copilotAgentService.run(request.role(), request.question(), request.dryRun(), request.approveActions());
    }

    @PostMapping(value = "/copilot/agent/run/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #request.role)")
    public SseEmitter copilotAgentRunStream(@RequestBody @Valid CopilotAgentRunRequest request) {
        SseEmitter emitter = new SseEmitter(60_000L);
        CompletableFuture.runAsync(() -> {
            try {
                copilotAgentService.runWithEvents(request.role(), request.question(), request.dryRun(), request.approveActions(), event -> {
                    try {
                        String eventName = String.valueOf(event.getOrDefault("event", "message"));
                        emitter.send(SseEmitter.event().name(eventName).data(event));
                    } catch (IOException e) {
                        throw new IllegalStateException("Failed to emit SSE event", e);
                    }
                });
                emitter.send(SseEmitter.event().name("done").data("complete"));
                emitter.complete();
            } catch (Exception ex) {
                try {
                    emitter.send(SseEmitter.event().name("error").data(Map.of("error", ex.getMessage())));
                } catch (IOException ignored) {
                    // ignore
                }
                emitter.completeWithError(ex);
            }
        });
        return emitter;
    }

    @GetMapping("/copilot/agent/runs/{id}")
    public Map<String, Object> copilotAgentRunStatus(@PathVariable UUID id) {
        return copilotAgentService.runStatus(id);
    }

    @GetMapping("/copilot/agent/runs")
    public java.util.List<Map<String, Object>> copilotAgentRuns(@RequestParam(defaultValue = "0") int page,
                                                                 @RequestParam(defaultValue = "20") int size) {
        return copilotAgentService.runs(page, size);
    }

    @PostMapping("/copilot/agent/runs/{id}/cancel")
    public Map<String, Object> cancelAgentRun(@PathVariable UUID id) {
        return copilotAgentService.cancel(id);
    }

    @GetMapping("/copilot/agent/approvals")
    public java.util.List<Map<String, Object>> pendingApprovals(@RequestParam(defaultValue = "0") int page,
                                                                 @RequestParam(defaultValue = "20") int size) {
        return actionQueueService.pendingApprovals(page, size);
    }

    @PostMapping("/copilot/agent/approvals/{id}/approve")
    public Map<String, Object> approveAction(@PathVariable UUID id) {
        return actionQueueService.approve(id);
    }

    @PostMapping("/copilot/agent/approvals/{id}/reject")
    public Map<String, Object> rejectAction(@PathVariable UUID id,
                                            @RequestBody(required = false) ActionApprovalDecisionRequest request) {
        String reason = request == null ? null : request.reason();
        return actionQueueService.reject(id, reason);
    }

    @PostMapping("/copilot/agent/approvals/expire")
    public Map<String, Object> expireApprovals() {
        return Map.of("expired", actionQueueService.expirePendingApprovals());
    }

    @GetMapping("/forecast/{metric}")
    public Map<String, Object> forecast(@PathVariable String metric) {
        return forecastService.forecast(metric);
    }

    @PostMapping("/forecast/jobs/{metric}")
    public Map<String, Object> enqueueForecast(@PathVariable String metric) {
        return Map.of("jobId", forecastJobService.enqueue(metric));
    }

    @GetMapping("/forecast/jobs/{id}")
    public Map<String, Object> forecastJob(@PathVariable UUID id) {
        return forecastJobService.get(id);
    }

    @GetMapping("/anomalies/explain/{id}")
    public Map<String, Object> explain(@PathVariable String id) {
        return anomalyService.explain(id);
    }

    @GetMapping("/briefing/{role}")
    @PreAuthorize("@roleScopeGuard.canAccessRole(authentication, #role)")
    public Map<String, Object> briefing(@PathVariable String role) {
        return copilotService.briefing(role);
    }

    @PostMapping("/admin/reindex")
    @PreAuthorize("hasRole('CEO') or hasRole('CFO')")
    public Map<String, Object> reindex(@RequestParam UUID tenantId) {
        return Map.of("indexedChunks", ragIngestionService.reindexTenant(tenantId));
    }
}
