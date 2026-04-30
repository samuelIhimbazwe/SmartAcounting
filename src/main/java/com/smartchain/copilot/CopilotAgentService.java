package com.smartchain.copilot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.anomaly.AnomalyService;
import com.smartchain.audit.AuditService;
import com.smartchain.dashboard.DashboardService;
import com.smartchain.forecast.ForecastService;
import com.smartchain.service.ActionQueueService;
import com.smartchain.service.HrService;
import com.smartchain.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CancellationException;
import java.util.function.Consumer;

@Service
public class CopilotAgentService {
    private final JdbcTemplate jdbcTemplate;
    private final CopilotService copilotService;
    private final ForecastService forecastService;
    private final DashboardService dashboardService;
    private final AnomalyService anomalyService;
    private final AuditService auditService;
    private final ActionQueueService actionQueueService;
    private final CopilotAgentAuditService copilotAgentAuditService;
    private final CopilotToolPolicyService toolPolicyService;
    private final RolePersonaService rolePersonaService;
    private final HrService hrService;
    private final long maxDurationSeconds;
    private final int maxSteps;
    private final ObjectMapper objectMapper;

    public CopilotAgentService(JdbcTemplate jdbcTemplate,
                               CopilotService copilotService,
                               ForecastService forecastService,
                               DashboardService dashboardService,
                               AnomalyService anomalyService,
                               AuditService auditService,
                               ActionQueueService actionQueueService,
                               CopilotAgentAuditService copilotAgentAuditService,
                               CopilotToolPolicyService toolPolicyService,
                               RolePersonaService rolePersonaService,
                               HrService hrService,
                               @Value("${smartchain.copilot.agent.execution.max-duration-seconds:45}") long maxDurationSeconds,
                               @Value("${smartchain.copilot.agent.execution.max-steps:16}") int maxSteps,
                               ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.copilotService = copilotService;
        this.forecastService = forecastService;
        this.dashboardService = dashboardService;
        this.anomalyService = anomalyService;
        this.auditService = auditService;
        this.actionQueueService = actionQueueService;
        this.copilotAgentAuditService = copilotAgentAuditService;
        this.toolPolicyService = toolPolicyService;
        this.rolePersonaService = rolePersonaService;
        this.hrService = hrService;
        this.maxDurationSeconds = maxDurationSeconds;
        this.maxSteps = maxSteps;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> run(String role, String question) {
        return runWithEvents(role, question, null, null, event -> {
            // No-op event sink for non-streaming invocation.
        });
    }

    @Transactional
    public Map<String, Object> run(String role, String question, Boolean dryRun, Boolean approveActions) {
        return runWithEvents(role, question, dryRun, approveActions, event -> {
            // No-op event sink for non-streaming invocation.
        });
    }

    @Transactional
    public Map<String, Object> runWithEvents(String role,
                                             String question,
                                             Boolean requestedDryRun,
                                             Boolean approveActions,
                                             Consumer<Map<String, Object>> eventSink) {
        UUID tenantId = requireTenant();
        UUID userId = requireUser();
        UUID runId = UUID.randomUUID();
        boolean dryRun = toolPolicyService.isDryRun(requestedDryRun);
        AgentContext context = new AgentContext(
            tenantId,
            userId,
            role,
            question,
            dryRun,
            approveActions,
            Instant.now(),
            Instant.now().plusSeconds(Math.max(5, maxDurationSeconds)),
            Math.max(4, maxSteps)
        );
        List<Map<String, Object>> plan = List.of(
            Map.of("step", 1, "type", "RETRIEVE_CONTEXT"),
            Map.of("step", 2, "type", "ROLE_PERSONA_ALIGNMENT"),
            Map.of("step", 3, "type", "OPTIONAL_TOOLS"),
            Map.of("step", 4, "type", "SYNTHESIZE")
        );
        jdbcTemplate.update(
            """
            insert into copilot_agent_runs
            (id, tenant_id, user_id, role, question, prompt_version, status, plan_json, created_at)
            values (?, ?, ?, ?, ?, ?, 'RUNNING', CAST(? AS jsonb), now())
            """,
            runId, tenantId, userId, role, question, copilotService.promptVersion(), toJson(plan)
        );
        emit(eventSink, Map.of(
            "event", "run_started",
            "runId", runId,
            "role", role,
            "persona", rolePersonaService.personaFor(role).label(),
            "question", question,
            "dryRun", dryRun,
            "deadlineAt", context.deadlineAt().toString(),
            "plan", plan
        ));
        copilotAgentAuditService.log(runId, "RUN_STARTED", Map.of(
            "role", role,
            "persona", rolePersonaService.personaFor(role).label(),
            "question", question,
            "dryRun", dryRun,
            "plan", plan
        ));

        List<Map<String, Object>> steps = new ArrayList<>();
        try {
            assertRunActive(context, runId, 1);
            List<Map<String, Object>> docs = copilotService.retrieveDocs(tenantId, role, question, 8);
            Map<String, Object> retrieveStep = Map.of("step", 1, "type", "RETRIEVE_CONTEXT", "status", "COMPLETED", "docCount", docs.size());
            persistStep(runId, 1, "RETRIEVE_CONTEXT", "COMPLETED", retrieveStep);
            steps.add(retrieveStep);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", retrieveStep));
            copilotAgentAuditService.log(runId, "STEP_RETRIEVE_CONTEXT", retrieveStep);

            Map<String, Object> toolSignals = new LinkedHashMap<>();
            assertRunActive(context, runId, 2);
            Map<String, Object> personaStep = Map.of(
                "step", 2,
                "type", "ROLE_PERSONA_ALIGNMENT",
                "status", "COMPLETED",
                "persona", rolePersonaService.personaFor(role)
            );
            persistStep(runId, 2, "ROLE_PERSONA_ALIGNMENT", "COMPLETED", personaStep);
            steps.add(personaStep);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", personaStep));
            copilotAgentAuditService.log(runId, "STEP_ROLE_PERSONA_ALIGNMENT", personaStep);
            runTools(context, toolSignals, runId, 3, steps, eventSink);

            assertRunActive(context, runId, 4);
            Map<String, Object> response = copilotService.buildAgentResponse(role, question, docs, toolSignals, steps);
            persistStep(runId, 4, "SYNTHESIZE", "COMPLETED", Map.of("step", 4, "type", "SYNTHESIZE", "status", "COMPLETED"));
            steps.add(Map.of("step", 4, "type", "SYNTHESIZE", "status", "COMPLETED"));
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", Map.of("step", 4, "type", "SYNTHESIZE", "status", "COMPLETED")));
            copilotAgentAuditService.log(runId, "STEP_SYNTHESIZE", Map.of("status", "COMPLETED"));
            int updated = jdbcTemplate.update(
                """
                update copilot_agent_runs
                set status = 'COMPLETED',
                    response_json = CAST(? AS jsonb),
                    completed_at = now()
                where id = ? and status = 'RUNNING'
                """,
                toJson(response), runId
            );
            if (updated == 0) {
                throw new CancellationException("Run was cancelled before completion");
            }
            auditService.logAction("AI_AGENT_RUN", "COPILOT_AGENT", "{}", "{\"runId\":\"" + runId + "\",\"role\":\"" + role + "\"}");
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("runId", runId);
            result.put("status", "COMPLETED");
            result.put("dryRun", dryRun);
            result.put("persona", rolePersonaService.personaFor(role));
            result.put("response", response);
            emit(eventSink, Map.of("event", "completed", "runId", runId, "payload", result));
            copilotAgentAuditService.log(runId, "RUN_COMPLETED", Map.of("toolSignals", toolSignals.keySet(), "responseKeys", response.keySet()));
            return result;
        } catch (CancellationException ex) {
            String reason = ex.getMessage() == null ? "cancelled" : ex.getMessage();
            String status = reason.toLowerCase().contains("duration") || reason.toLowerCase().contains("timed out")
                ? "TIMED_OUT"
                : "CANCELLED";
            jdbcTemplate.update(
                "update copilot_agent_runs set status = ?, error_message = ?, completed_at = now() where id = ? and status = 'RUNNING'",
                status, reason, runId
            );
            persistStep(runId, 98, status, status, Map.of("reason", reason));
            emit(eventSink, Map.of("event", "TIMED_OUT".equals(status) ? "timed_out" : "cancelled", "runId", runId, "reason", reason));
            copilotAgentAuditService.log(runId, "TIMED_OUT".equals(status) ? "RUN_TIMED_OUT" : "RUN_CANCELLED", Map.of("reason", reason));
            throw new IllegalStateException("TIMED_OUT".equals(status) ? "Agent run timed out" : "Agent run cancelled");
        } catch (Exception ex) {
            jdbcTemplate.update(
                "update copilot_agent_runs set status = 'FAILED', error_message = ?, completed_at = now() where id = ?",
                ex.getMessage(), runId
            );
            persistStep(runId, 99, "FAILED", "FAILED", Map.of("error", ex.getMessage()));
            emit(eventSink, Map.of("event", "failed", "runId", runId, "error", ex.getMessage()));
            copilotAgentAuditService.log(runId, "RUN_FAILED", Map.of("error", ex.getMessage()));
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> runStatus(UUID runId) {
        UUID tenantId = requireTenant();
        UUID userId = requireUser();
        List<Map<String, Object>> rows = jdbcTemplate.query(
            """
            select id, role, question, prompt_version, status, response_json, error_message, created_at, completed_at
            from copilot_agent_runs
            where id = ? and tenant_id = ? and user_id = ?
            """,
            (rs, rowNum) -> {
                Map<String, Object> out = new LinkedHashMap<>();
                out.put("runId", UUID.fromString(rs.getString("id")));
                out.put("role", rs.getString("role"));
                out.put("question", rs.getString("question"));
                out.put("promptVersion", rs.getString("prompt_version"));
                out.put("status", rs.getString("status"));
                out.put("response", parseJson(rs.getString("response_json")));
                out.put("error", rs.getString("error_message"));
                out.put("createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant()));
                out.put("completedAt", String.valueOf(rs.getTimestamp("completed_at") == null ? null : rs.getTimestamp("completed_at").toInstant()));
                out.put("steps", steps(runId));
                out.put("auditTrail", copilotAgentAuditService.byRun(runId));
                return out;
            },
            runId, tenantId, userId
        );
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Agent run not found");
        }
        return rows.get(0);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> runs(int page, int size) {
        UUID tenantId = requireTenant();
        UUID userId = requireUser();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        return jdbcTemplate.query(
            """
            select id, role, question, status, prompt_version, created_at, completed_at
            from copilot_agent_runs
            where tenant_id = ? and user_id = ?
            order by created_at desc
            offset ? limit ?
            """,
            (rs, rowNum) -> Map.<String, Object>of(
                "runId", UUID.fromString(rs.getString("id")),
                "role", rs.getString("role"),
                "question", rs.getString("question"),
                "status", rs.getString("status"),
                "promptVersion", rs.getString("prompt_version"),
                "createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant()),
                "completedAt", String.valueOf(rs.getTimestamp("completed_at") == null ? null : rs.getTimestamp("completed_at").toInstant())
            ),
            tenantId, userId, safePage * safeSize, safeSize
        );
    }

    @Transactional
    public Map<String, Object> cancel(UUID runId) {
        UUID tenantId = requireTenant();
        UUID userId = requireUser();
        int updated = jdbcTemplate.update(
            """
            update copilot_agent_runs
            set status = 'CANCELLED', error_message = 'Cancelled by user', completed_at = now()
            where id = ? and tenant_id = ? and user_id = ? and status = 'RUNNING'
            """,
            runId, tenantId, userId
        );
        if (updated == 0) {
            throw new IllegalArgumentException("Running agent run not found");
        }
        persistStep(runId, 98, "CANCELLED", "CANCELLED", Map.of("reason", "Cancelled by user"));
        copilotAgentAuditService.log(runId, "RUN_CANCEL_REQUESTED", Map.of("byUser", userId.toString()));
        return Map.of("runId", runId, "status", "CANCELLED");
    }

    private void runTools(AgentContext context,
                          Map<String, Object> toolSignals,
                          UUID runId,
                          int stepNo,
                          List<Map<String, Object>> steps,
                          Consumer<Map<String, Object>> eventSink) {
        assertRunActive(context, runId, stepNo);
        String role = context.role();
        String question = context.question();
        String normalized = question.toLowerCase();
        boolean dryRun = context.dryRun();
        Boolean approveActions = context.approveActions();
        boolean usedAnyTool = false;
        if ((normalized.contains("forecast") || normalized.contains("predict")) && toolPolicyService.canUseTool(role, "FORECAST")) {
            assertRunActive(context, runId, stepNo);
            String metric = inferMetric(normalized);
            Map<String, Object> forecast = forecastService.forecast(metric);
            assertRunActive(context, runId, stepNo);
            toolSignals.put("forecast", forecast);
            Map<String, Object> step = Map.of(
                "step", stepNo,
                "type", "TOOL_FORECAST_NATIVE",
                "status", "COMPLETED",
                "metric", metric,
                "native", true
            );
            persistStep(runId, stepNo, "TOOL_FORECAST", "COMPLETED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_FORECAST_NATIVE", step);
            usedAnyTool = true;
        } else if (normalized.contains("forecast") || normalized.contains("predict")) {
            Map<String, Object> step = policyBlockedStep(stepNo, "TOOL_FORECAST_NATIVE", role);
            persistStep(runId, stepNo, "TOOL_FORECAST_NATIVE", "BLOCKED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_BLOCKED", step);
        }
        if ((normalized.contains("anomaly") || normalized.contains("risk")) && toolPolicyService.canUseTool(role, "ANOMALY")) {
            assertRunActive(context, runId, stepNo);
            Map<String, Object> anomaly = anomalyService.explain("agent-auto");
            toolSignals.put("anomaly", anomaly);
            Map<String, Object> step = Map.of("step", stepNo, "type", "TOOL_ANOMALY_EXPLAIN", "status", "COMPLETED");
            persistStep(runId, stepNo, "TOOL_ANOMALY_EXPLAIN", "COMPLETED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_ANOMALY_EXPLAIN", step);
            usedAnyTool = true;
        } else if (normalized.contains("anomaly") || normalized.contains("risk")) {
            Map<String, Object> step = policyBlockedStep(stepNo, "TOOL_ANOMALY_EXPLAIN", role);
            persistStep(runId, stepNo, "TOOL_ANOMALY_EXPLAIN", "BLOCKED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_BLOCKED", step);
        }
        if ((normalized.contains("kpi") || normalized.contains("dashboard") || normalized.contains("cash") || normalized.contains("revenue"))
            && toolPolicyService.canUseTool(role, "DASHBOARD_KPI")) {
            assertRunActive(context, runId, stepNo);
            List<?> kpis = dashboardService.kpis(normalizeRoleForDashboard(role));
            toolSignals.put("kpis", kpis);
            Map<String, Object> step = Map.of("step", stepNo, "type", "TOOL_DASHBOARD_KPI", "status", "COMPLETED", "kpiCount", kpis.size());
            persistStep(runId, stepNo, "TOOL_DASHBOARD_KPI", "COMPLETED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_DASHBOARD_KPI", step);
            usedAnyTool = true;
        } else if (normalized.contains("kpi") || normalized.contains("dashboard") || normalized.contains("cash") || normalized.contains("revenue")) {
            Map<String, Object> step = policyBlockedStep(stepNo, "TOOL_DASHBOARD_KPI", role);
            persistStep(runId, stepNo, "TOOL_DASHBOARD_KPI", "BLOCKED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_BLOCKED", step);
        }
        if ((normalized.contains("ar/ap") || normalized.contains("aging") || normalized.contains("overdue"))
            && toolPolicyService.canUseTool(role, "ARAP_AGING")) {
            assertRunActive(context, runId, stepNo);
            Map<String, Object> aging = arApAgingSnapshot();
            toolSignals.put("arApAging", aging);
            Map<String, Object> step = Map.of("step", stepNo, "type", "TOOL_ARAP_AGING", "status", "COMPLETED");
            persistStep(runId, stepNo, "TOOL_ARAP_AGING", "COMPLETED", Map.of("summary", aging));
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_ARAP_AGING", aging);
            usedAnyTool = true;
        } else if (normalized.contains("ar/ap") || normalized.contains("aging") || normalized.contains("overdue")) {
            Map<String, Object> step = policyBlockedStep(stepNo, "TOOL_ARAP_AGING", role);
            persistStep(runId, stepNo, "TOOL_ARAP_AGING", "BLOCKED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_BLOCKED", step);
        }
        if ((normalized.contains("inventory") || normalized.contains("stock")) && toolPolicyService.canUseTool(role, "INVENTORY_RISK")) {
            assertRunActive(context, runId, stepNo);
            Map<String, Object> inventory = inventoryRiskSnapshot();
            toolSignals.put("inventoryRisk", inventory);
            Map<String, Object> step = Map.of("step", stepNo, "type", "TOOL_INVENTORY_RISK", "status", "COMPLETED");
            persistStep(runId, stepNo, "TOOL_INVENTORY_RISK", "COMPLETED", Map.of("summary", inventory));
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_INVENTORY_RISK", inventory);
            usedAnyTool = true;
        } else if (normalized.contains("inventory") || normalized.contains("stock")) {
            Map<String, Object> step = policyBlockedStep(stepNo, "TOOL_INVENTORY_RISK", role);
            persistStep(runId, stepNo, "TOOL_INVENTORY_RISK", "BLOCKED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_BLOCKED", step);
        }
        if ((normalized.contains("headcount") || normalized.contains("workforce")) && toolPolicyService.canUseTool(role, "HR_HEADCOUNT")) {
            assertRunActive(context, runId, stepNo);
            Map<String, Object> headcount = hrService.headcount();
            toolSignals.put("hrHeadcount", headcount);
            Map<String, Object> step = Map.of("step", stepNo, "type", "TOOL_HR_HEADCOUNT", "status", "COMPLETED");
            persistStep(runId, stepNo, "TOOL_HR_HEADCOUNT", "COMPLETED", headcount);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_HR_HEADCOUNT", headcount);
            usedAnyTool = true;
        } else if (normalized.contains("headcount") || normalized.contains("workforce")) {
            Map<String, Object> step = policyBlockedStep(stepNo, "TOOL_HR_HEADCOUNT", role);
            persistStep(runId, stepNo, "TOOL_HR_HEADCOUNT", "BLOCKED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_BLOCKED", step);
        }
        if ((normalized.contains("pipeline") || normalized.contains("deal")) && toolPolicyService.canUseTool(role, "SALES_PIPELINE")) {
            assertRunActive(context, runId, stepNo);
            Map<String, Object> pipeline = salesPipelineSnapshot();
            toolSignals.put("salesPipeline", pipeline);
            Map<String, Object> step = Map.of("step", stepNo, "type", "TOOL_SALES_PIPELINE", "status", "COMPLETED");
            persistStep(runId, stepNo, "TOOL_SALES_PIPELINE", "COMPLETED", pipeline);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_SALES_PIPELINE", pipeline);
            usedAnyTool = true;
        } else if (normalized.contains("pipeline") || normalized.contains("deal")) {
            Map<String, Object> step = policyBlockedStep(stepNo, "TOOL_SALES_PIPELINE", role);
            persistStep(runId, stepNo, "TOOL_SALES_PIPELINE", "BLOCKED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_BLOCKED", step);
        }
        if (normalized.contains("action:")) {
            assertRunActive(context, runId, stepNo);
            Map<String, Object> queued = queueActionFromPrompt(role, question, dryRun, approveActions);
            String status = String.valueOf(queued.getOrDefault("status", "COMPLETED"));
            toolSignals.put("actionDecision", queued);
            Map<String, Object> step = Map.of("step", stepNo, "type", "TOOL_ACTION_QUEUE_ENQUEUE", "status", status);
            persistStep(runId, stepNo, "TOOL_ACTION_QUEUE_ENQUEUE", status, queued);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOL_ACTION_QUEUE_ENQUEUE", queued);
            if ("COMPLETED".equals(status) || "PREVIEW".equals(status) || "PENDING_APPROVAL".equals(status)) {
                usedAnyTool = true;
            }
        }
        if (!usedAnyTool) {
            Map<String, Object> step = Map.of("step", stepNo, "type", "OPTIONAL_TOOLS", "status", "SKIPPED");
            persistStep(runId, stepNo, "OPTIONAL_TOOLS", "SKIPPED", step);
            steps.add(step);
            emit(eventSink, Map.of("event", "step", "runId", runId, "payload", step));
            copilotAgentAuditService.log(runId, "TOOLS_SKIPPED", step);
        }
    }

    private Map<String, Object> policyBlockedStep(int stepNo, String toolType, String role) {
        return Map.of(
            "step", stepNo,
            "type", toolType,
            "status", "BLOCKED",
            "reason", "role_policy",
            "role", role
        );
    }

    private List<Map<String, Object>> steps(UUID runId) {
        return jdbcTemplate.query(
            """
            select step_no, step_type, status, detail_json, created_at
            from copilot_agent_steps
            where run_id = ?
            order by step_no asc, created_at asc
            """,
            (rs, rowNum) -> {
                Map<String, Object> step = new LinkedHashMap<>();
                step.put("step", rs.getInt("step_no"));
                step.put("type", rs.getString("step_type"));
                step.put("status", rs.getString("status"));
                step.put("detail", parseJson(rs.getString("detail_json")));
                step.put("createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant()));
                return step;
            },
            runId
        );
    }

    private void persistStep(UUID runId, int stepNo, String type, String status, Object detail) {
        jdbcTemplate.update(
            """
            insert into copilot_agent_steps (id, run_id, step_no, step_type, status, detail_json, created_at)
            values (?, ?, ?, ?, ?, CAST(? AS jsonb), now())
            """,
            UUID.randomUUID(), runId, stepNo, type, status, toJson(detail)
        );
    }

    private String inferMetric(String question) {
        if (question.contains("inventory")) return "inventory_level";
        if (question.contains("cash")) return "cash_runway";
        if (question.contains("revenue")) return "revenue_growth";
        return "inventory_level";
    }

    private Map<String, Object> arApAgingSnapshot() {
        UUID tenant = requireTenant();
        Map<String, Object> out = new LinkedHashMap<>();
        Integer overdueInvoices = jdbcTemplate.queryForObject(
            "select count(*) from invoices where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date",
            Integer.class, tenant
        );
        Integer overdueSupplierBills = jdbcTemplate.queryForObject(
            "select count(*) from supplier_bills where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date",
            Integer.class, tenant
        );
        Object invoiceExposure = jdbcTemplate.queryForObject(
            "select coalesce(sum(amount),0) from invoices where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date",
            Object.class, tenant
        );
        Object supplierExposure = jdbcTemplate.queryForObject(
            "select coalesce(sum(amount),0) from supplier_bills where tenant_id = ? and status = 'OPEN' and deleted_at is null and due_date < current_date",
            Object.class, tenant
        );
        out.put("overdueInvoiceCount", overdueInvoices == null ? 0 : overdueInvoices);
        out.put("overdueSupplierBillCount", overdueSupplierBills == null ? 0 : overdueSupplierBills);
        out.put("overdueReceivableExposure", String.valueOf(invoiceExposure));
        out.put("overduePayableExposure", String.valueOf(supplierExposure));
        return out;
    }

    private Map<String, Object> inventoryRiskSnapshot() {
        UUID tenant = requireTenant();
        Integer locationsAtRisk = jdbcTemplate.queryForObject(
            "select count(*) from inventory_balances where tenant_id = ? and quantity <= 10",
            Integer.class, tenant
        );
        Object totalUnits = jdbcTemplate.queryForObject(
            "select coalesce(sum(quantity),0) from inventory_balances where tenant_id = ?",
            Object.class, tenant
        );
        return Map.of(
            "locationsAtRisk", locationsAtRisk == null ? 0 : locationsAtRisk,
            "totalUnits", String.valueOf(totalUnits),
            "riskThreshold", "quantity<=10"
        );
    }

    private Map<String, Object> salesPipelineSnapshot() {
        UUID tenant = requireTenant();
        Integer openDeals = jdbcTemplate.queryForObject(
            "select count(*) from sales_orders where tenant_id = ? and status in ('CONFIRMED','OPEN')",
            Integer.class, tenant
        );
        Object pipelineValue = jdbcTemplate.queryForObject(
            "select coalesce(sum(total_amount),0) from sales_orders where tenant_id = ? and status in ('CONFIRMED','OPEN')",
            Object.class, tenant
        );
        return Map.of(
            "openDeals", openDeals == null ? 0 : openDeals,
            "pipelineValue", String.valueOf(pipelineValue)
        );
    }

    private Map<String, Object> queueActionFromPrompt(String role, String question, boolean dryRun, Boolean approveActions) {
        if (!toolPolicyService.canUseTool(role, "ACTION_QUEUE")) {
            return Map.of("status", "BLOCKED", "reason", "role_policy", "type", "AGENT_RECOMMENDATION");
        }
        if (dryRun) {
            return Map.of(
                "status", "PREVIEW",
                "reason", "dry_run",
                "approvalRequired", toolPolicyService.actionNeedsApproval(),
                "type", "AGENT_RECOMMENDATION",
                "previewPayload", Map.of("question", question)
            );
        }
        if (toolPolicyService.actionNeedsApproval() && !Boolean.TRUE.equals(approveActions)) {
            Instant expiresAt = Instant.now().plusSeconds(toolPolicyService.actionApprovalTtlSeconds());
            UUID approvalId = actionQueueService.enqueuePendingApproval(
                "AGENT_RECOMMENDATION",
                "copilot-agent",
                toJson(Map.of("question", question, "timestamp", Instant.now().toString())),
                expiresAt
            );
            return Map.of(
                "status", "PENDING_APPROVAL",
                "approvalRequired", true,
                "approvalId", approvalId,
                "approvalExpiresAt", expiresAt.toString(),
                "type", "AGENT_RECOMMENDATION"
            );
        }
        if (!toolPolicyService.canExecuteActionWrite(role, false, approveActions)) {
            return Map.of("status", "BLOCKED", "reason", "approval_required", "type", "AGENT_RECOMMENDATION");
        }
        UUID id = actionQueueService.enqueue(
            "AGENT_RECOMMENDATION",
            "copilot-agent",
            toJson(Map.of("question", question, "timestamp", Instant.now().toString()))
        );
        return Map.of("status", "COMPLETED", "queuedActionId", id, "type", "AGENT_RECOMMENDATION");
    }

    private String normalizeRoleForDashboard(String role) {
        if ("ops".equalsIgnoreCase(role)) {
            return "operations";
        }
        return role;
    }

    private Object parseJson(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json.getBytes(StandardCharsets.UTF_8), Map.class);
        } catch (Exception ex) {
            return Map.of("raw", json);
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to serialize agent payload", ex);
        }
    }

    private void assertRunActive(AgentContext context, UUID runId, int stepNo) {
        if (stepNo > context.maxSteps()) {
            throw new CancellationException("Run exceeded step cap");
        }
        if (Instant.now().isAfter(context.deadlineAt())) {
            jdbcTemplate.update(
                "update copilot_agent_runs set status = 'TIMED_OUT', error_message = 'Run timed out', completed_at = now() where id = ? and status = 'RUNNING'",
                runId
            );
            throw new CancellationException("Run exceeded max duration");
        }
        String status = jdbcTemplate.query(
            "select status from copilot_agent_runs where id = ?",
            (rs, rowNum) -> rs.getString(1),
            runId
        ).stream().findFirst().orElse("UNKNOWN");
        if ("CANCELLED".equals(status)) {
            throw new CancellationException("Run cancelled");
        }
        if ("TIMED_OUT".equals(status)) {
            throw new CancellationException("Run timed out");
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }

    private UUID requireUser() {
        if (TenantContext.userId() == null) {
            throw new IllegalStateException("User context is required");
        }
        return TenantContext.userId();
    }

    private void emit(Consumer<Map<String, Object>> sink, Map<String, Object> event) {
        try {
            sink.accept(event);
        } catch (Exception ignored) {
            // Streaming failures should not fail persisted agent execution.
        }
    }

    private record AgentContext(
        UUID tenantId,
        UUID userId,
        String role,
        String question,
        boolean dryRun,
        Boolean approveActions,
        Instant startedAt,
        Instant deadlineAt,
        int maxSteps
    ) {
    }
}
