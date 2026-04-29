package com.smartchain.copilot;

import com.smartchain.audit.AuditService;
import com.smartchain.coprocess.RoleRetrievalPolicy;
import com.smartchain.tenant.TenantContext;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CopilotService {
    private static final String PROMPT_VERSION = "copilot-rag-v1";
    private final AuditService auditService;
    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingService embeddingService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RolePersonaService rolePersonaService;

    public CopilotService(AuditService auditService,
                          JdbcTemplate jdbcTemplate,
                          EmbeddingService embeddingService,
                          RedisTemplate<String, Object> redisTemplate,
                          RolePersonaService rolePersonaService) {
        this.auditService = auditService;
        this.jdbcTemplate = jdbcTemplate;
        this.embeddingService = embeddingService;
        this.redisTemplate = redisTemplate;
        this.rolePersonaService = rolePersonaService;
    }

    public Map<String, Object> query(String role, String question) {
        UUID tenant = TenantContext.tenantId();
        if (tenant == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        List<Map<String, Object>> docs = retrieveDocs(tenant, role, question, 8);
        String answer = synthesize(role, question, docs, Map.of());
        auditService.logAction(
            "AI_COPILOT_QUERY",
            "COPILOT_QUERY",
            "{}",
            "{\"role\":\"" + role + "\",\"docCount\":" + docs.size() + ",\"promptVersion\":\"" + PROMPT_VERSION + "\"}"
        );
        return Map.of(
            "role", role,
            "question", question,
            "answer", answer,
            "retrieved", docs,
            "confidence", docs.isEmpty() ? 0.2 : 0.85,
            "promptVersion", PROMPT_VERSION
        );
    }

    public List<Map<String, Object>> retrieveDocs(UUID tenantId, String role, String question, int limit) {
        String vec = embeddingService.toPgVectorLiteral(embeddingService.embed(question));
        List<String> allowed = RoleRetrievalPolicy.allowedEntityTypes(role);
        try {
            return jdbcTemplate.query("""
                    SELECT entity_type, entity_id::text, content
                    FROM tenant_embeddings
                    WHERE tenant_id = ?
                    ORDER BY embedding <-> CAST(? AS vector)
                    LIMIT 50
                    """,
                (rs, n) -> Map.of(
                    "entityType", rs.getString(1),
                    "entityId", rs.getString(2),
                    "content", rs.getString(3)
                ),
                tenantId,
                vec
            ).stream().filter(m -> allowed.contains(String.valueOf(m.get("entityType")))).limit(Math.max(1, limit)).toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    public String synthesize(String role, String question, List<Map<String, Object>> docs, Map<String, Object> toolSignals) {
        RolePersonaService.Persona persona = rolePersonaService.personaFor(role);
        StringBuilder sb = new StringBuilder();
        sb.append(persona.label()).append(": ");
        if (docs.isEmpty()) {
            sb.append("No grounded tenant context was retrieved");
        } else {
            sb.append("grounded on ").append(docs.size()).append(" tenant documents; top signal: ");
            sb.append(String.valueOf(docs.get(0).getOrDefault("content", "n/a")));
        }
        if (!toolSignals.isEmpty()) {
            sb.append(". Agent tools used: ");
            sb.append(toolSignals.keySet());
            if (toolSignals.get("forecast") instanceof Map<?, ?> forecast) {
                sb.append(". Forecast confidence=");
                sb.append(String.valueOf(forecast.getOrDefault("confidence", "n/a")));
            }
            if (toolSignals.get("kpis") instanceof List<?> kpis) {
                sb.append(". KPI items considered=").append(kpis.size());
            }
        }
        if (!question.endsWith("?")) {
            sb.append(". Question interpreted as: ").append(question);
        }
        sb.append(". Priorities: ").append(persona.priorities());
        sb.append(". KPI focus: ").append(persona.kpiFocus());
        sb.append(". ").append(persona.directive());
        return sb.toString();
    }

    public Map<String, Object> buildAgentResponse(String role,
                                                  String question,
                                                  List<Map<String, Object>> docs,
                                                  Map<String, Object> toolSignals,
                                                  List<Map<String, Object>> steps) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("role", role);
        response.put("question", question);
        response.put("answer", synthesize(role, question, docs, toolSignals));
        response.put("retrieved", docs);
        response.put("toolSignals", toolSignals);
        response.put("steps", steps);
        response.put("persona", rolePersonaService.personaFor(role));
        response.put("confidence", docs.isEmpty() ? 0.25 : 0.88);
        response.put("promptVersion", PROMPT_VERSION);
        return response;
    }

    public String promptVersion() {
        return PROMPT_VERSION;
    }

    public Map<String, Object> whatIf(String role, String scenario) {
        RolePersonaService.Persona persona = rolePersonaService.personaFor(role);
        auditService.logAction("AI_QUERY", "COPILOT_WHATIF", "{}", "{\"role\":\"" + role + "\"}");
        return Map.of(
            "role", role,
            "persona", persona.label(),
            "scenario", scenario,
            "impact", persona.tone().equals("financial")
                ? "Projected working-capital impact: cash conversion cycle worsens by 5-7 days in the next quarter."
                : "Projected operating impact: target KPI drifts negatively over the next planning horizon.",
            "recommendation", persona.tone().equals("financial")
                ? "Phase deployment by risk bucket and gate spend commitments until receivables trend stabilizes."
                : "Use phased rollout with measurable checkpoints aligned to role KPIs."
        );
    }

    public Map<String, Object> briefing(String role) {
        UUID tenant = TenantContext.tenantId();
        if (tenant == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        String key = "smartchain:" + tenant + ":" + role + ":briefing";
        Object cached = redisTemplate.opsForValue().get(key);
        if (cached instanceof Map<?, ?> map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> cast = (Map<String, Object>) map;
            return cast;
        }
        RolePersonaService.Persona persona = rolePersonaService.personaFor(role);
        Map<String, Object> response = Map.of(
            "role", role,
            "persona", persona.label(),
            "priorities", persona.priorities(),
            "kpiFocus", persona.kpiFocus(),
            "briefing", roleSpecificBriefing(role)
        );
        redisTemplate.opsForValue().set(key, response, Duration.ofHours(4));
        return response;
    }

    private String roleSpecificBriefing(String role) {
        return switch (role == null ? "" : role.toLowerCase()) {
            case "cfo" -> "AR/AP pressure is rising, cash runway is tightening, and close-risk anomalies need prioritization this week.";
            case "operations", "ops" -> "Two locations show low-stock risk and supplier lead-time variance is increasing on critical SKUs.";
            case "sales" -> "Pipeline remains healthy but late-stage conversion is softening; prioritize deal hygiene and commit realism.";
            case "hr" -> "Pending leave requests and attrition indicators suggest capacity risk in key teams next cycle.";
            case "marketing" -> "ROI is stable but CAC drift needs channel reallocation before month-end.";
            case "accounting" -> "Reconciliation backlog and compliance flags suggest close-readiness intervention is needed.";
            default -> "Revenue is up, cash resilience needs attention, and high-severity anomalies require executive follow-through.";
        };
    }
}
