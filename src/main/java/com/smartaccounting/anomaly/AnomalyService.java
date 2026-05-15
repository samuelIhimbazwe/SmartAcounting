package com.smartaccounting.anomaly;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.copilot.CopilotService;
import com.smartaccounting.entity.AnomalyCase;
import com.smartaccounting.repository.AnomalyCaseRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AnomalyService {

    private static final String SYSTEM_PROMPT = """
        You are a senior finance and operations analyst for SmartAccounting, a retail ERP platform.
        You will receive one persisted anomaly case as JSON (entityType/kpiName, detectedValue, expectedValue, deviation/z-score, narrative fields, contributors).
        Respond with ONLY valid JSON (no markdown code fences, no commentary outside JSON) using exactly these string keys:
        {"what":"","whySignificant":"","likelyCauses":"","recommendedActions":""}
        - "what": what the anomaly is in plain English for a business executive.
        - "whySignificant": why it matters for this retail business (controls, cash, inventory, or compliance as appropriate).
        - "likelyCauses": the most plausible causes grounded strictly in the supplied metrics and text.
        - "recommendedActions": concrete immediate next steps (bulleted sentences inside the string is fine).
        Use FRW or USD only when amounts or currency are explicit in the data; otherwise stay currency-agnostic.
        """;

    private final AnomalyCaseRepository anomalyCaseRepository;
    private final CopilotService copilotService;
    private final ObjectMapper objectMapper;

    public AnomalyService(AnomalyCaseRepository anomalyCaseRepository,
                          CopilotService copilotService,
                          ObjectMapper objectMapper) {
        this.anomalyCaseRepository = anomalyCaseRepository;
        this.copilotService = copilotService;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> explain(String id) {
        UUID tenantId = TenantContext.tenantId();
        if (tenantId == null) {
            return responseShape(
                id,
                "UNKNOWN",
                "Tenant context is required to load anomaly details for this request.",
                "Provide a valid authenticated request with tenant scope."
            );
        }

        final UUID caseId;
        try {
            caseId = UUID.fromString(id);
        } catch (IllegalArgumentException ex) {
            return responseShape(
                id,
                "INFO",
                "The explain endpoint expects the UUID of a persisted row in anomaly_cases (for example from the anomaly alerts UI or API).",
                "Retry with a valid anomaly case id, or create an anomaly case before requesting an explanation."
            );
        }

        Optional<AnomalyCase> found = anomalyCaseRepository.findByIdAndTenantId(caseId, tenantId);
        if (found.isEmpty()) {
            return responseShape(
                id,
                "UNKNOWN",
                "No anomaly case was found for this id in your tenant.",
                "Verify the id or list open cases for your role via the anomaly APIs."
            );
        }

        AnomalyCase c = found.get();
        String userMessage;
        try {
            userMessage = buildUserMessage(c);
        } catch (Exception ex) {
            return responseShape(
                id,
                nullToUnknown(c.getSeverity()),
                heuristicExplanation(c),
                heuristicLikelyCauses(c) + "\n\n(Note: failed to serialize case payload for LLM: " + ex.getMessage() + ")"
            );
        }

        Optional<String> llm = copilotService.anthropicSingleTurn(SYSTEM_PROMPT, userMessage);
        if (llm.isPresent()) {
            try {
                return mapLlmToContract(id, c.getSeverity(), llm.get());
            } catch (Exception parseOrMap) {
                return responseShape(
                    id,
                    nullToUnknown(c.getSeverity()),
                    llm.get(),
                    "Model returned non-JSON or unexpected shape; see explanation for the raw narrative. Contributors: "
                        + nullSafe(c.getContributorsJson())
                );
            }
        }

        return responseShape(
            id,
            nullToUnknown(c.getSeverity()),
            heuristicExplanation(c),
            heuristicLikelyCauses(c)
        );
    }

    private Map<String, Object> mapLlmToContract(String id, String severity, String rawModelText) throws Exception {
        String json = extractJsonObject(rawModelText.trim());
        JsonNode root = objectMapper.readTree(json);
        String what = textOrEmpty(root, "what");
        String why = textOrEmpty(root, "whySignificant");
        String causes = textOrEmpty(root, "likelyCauses");
        String actions = textOrEmpty(root, "recommendedActions");

        String explanation = joinNonEmpty("\n\n", what, why);
        if (!StringUtils.hasText(explanation)) {
            explanation = rawModelText.trim();
        }
        String likelyCauses = joinNonEmpty("\n\n", causes, actions);
        if (!StringUtils.hasText(likelyCauses)) {
            likelyCauses = "See explanation; model did not return separate cause/action fields.";
        }
        return responseShape(id, nullToUnknown(severity), explanation, likelyCauses);
    }

    private static String joinNonEmpty(String sep, String a, String b) {
        boolean ha = StringUtils.hasText(a);
        boolean hb = StringUtils.hasText(b);
        if (ha && hb) {
            return a + sep + b;
        }
        if (ha) {
            return a;
        }
        if (hb) {
            return b;
        }
        return "";
    }

    private static String textOrEmpty(JsonNode root, String field) {
        if (root == null || !root.has(field)) {
            return "";
        }
        String t = root.get(field).asText("");
        return t == null ? "" : t.trim();
    }

    private static String extractJsonObject(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return raw.substring(start, end + 1);
        }
        return raw;
    }

    private String buildUserMessage(AnomalyCase c) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("caseId", c.getId() != null ? c.getId().toString() : null);
        payload.put("tenantId", c.getTenantId() != null ? c.getTenantId().toString() : null);
        payload.put("affectedRole", c.getAffectedRole());
        payload.put("severity", c.getSeverity());
        payload.put("status", c.getStatus());
        payload.put("title", c.getTitle());
        payload.put("details", c.getDetails());
        payload.put("entityType", c.getKpiName());
        payload.put("kpiName", c.getKpiName());
        payload.put("detectedValue", c.getCurrentValue() != null ? c.getCurrentValue().toPlainString() : null);
        payload.put("expectedValue", c.getExpectedRange());
        payload.put("deviation", formatDecimal(c.getZScore()));
        payload.put("currentValue", c.getCurrentValue() != null ? c.getCurrentValue().toPlainString() : null);
        payload.put("expectedRange", c.getExpectedRange());
        payload.put("zScore", formatDecimal(c.getZScore()));
        payload.put("contributorsJson", c.getContributorsJson());
        payload.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);

        return "Analyze this anomaly case. Use only the JSON below as factual context.\n"
            + objectMapper.writeValueAsString(payload);
    }

    private static String formatDecimal(BigDecimal v) {
        return v == null ? null : v.toPlainString();
    }

    private static String heuristicExplanation(AnomalyCase c) {
        StringBuilder sb = new StringBuilder();
        sb.append("Anomaly: ").append(nullSafe(c.getTitle())).append("\n\n");
        sb.append("KPI ").append(nullSafe(c.getKpiName()))
            .append(" is at observed value ").append(formatDecimal(c.getCurrentValue()))
            .append(" versus expected range ").append(nullSafe(c.getExpectedRange()))
            .append(", with z-score ").append(formatDecimal(c.getZScore())).append(".\n\n");
        sb.append(nullSafe(c.getDetails()));
        return sb.toString().trim();
    }

    private static String heuristicLikelyCauses(AnomalyCase c) {
        return "Contributors / signals from detection: " + nullSafe(c.getContributorsJson())
            + "\n\nRecommended immediate actions: reconcile supporting journal entries and payments for the period, "
            + "confirm whether a one-off posting explains the spike, and escalate to the "
            + nullSafe(c.getAffectedRole()) + " role if the deviation persists after review.";
    }

    private static Map<String, Object> responseShape(String anomalyId, String severity, String explanation, String likelyCauses) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("anomalyId", anomalyId);
        out.put("severity", severity);
        out.put("explanation", explanation);
        out.put("likelyCauses", likelyCauses);
        return out;
    }

    private static String nullToUnknown(String s) {
        return StringUtils.hasText(s) ? s : "UNKNOWN";
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }
}
