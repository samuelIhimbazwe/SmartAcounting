package com.smartaccounting.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.audit.AuditService;
import com.smartaccounting.coprocess.RoleRetrievalPolicy;
import com.smartaccounting.briefing.BriefingMetricsService;
import com.smartaccounting.repository.CfoKpiSnapshotJdbcRepository;
import com.smartaccounting.repository.OpsKpiSnapshotJdbcRepository;
import com.smartaccounting.repository.SalesKpiSnapshotJdbcRepository;
import com.smartaccounting.tenant.TenantContext;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CopilotService {
    private static final Logger log = LoggerFactory.getLogger(CopilotService.class);
    private static final String PROMPT_VERSION = "copilot-rag-v2";
    /** Cached: vector RAG SQL requires pgvector + {@code tenant_embeddings} (see Flyway V13). */
    private volatile Boolean pgvectorRagAvailable;
    private final AuditService auditService;
    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingService embeddingService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RolePersonaService rolePersonaService;
    private final ObjectMapper objectMapper;
    private final WebClient anthropicWebClient;
    private final CompletionService completionService;
    private final BriefingMetricsService briefingMetricsService;
    private final CfoKpiSnapshotJdbcRepository cfoKpiSnapshotJdbcRepository;
    private final SalesKpiSnapshotJdbcRepository salesKpiSnapshotJdbcRepository;
    private final OpsKpiSnapshotJdbcRepository opsKpiSnapshotJdbcRepository;
    private final String completionProvider;
    private final String completionModel;
    private final String anthropicApiKey;
    private final int completionMaxTokens;

    public CopilotService(AuditService auditService,
                          JdbcTemplate jdbcTemplate,
                          EmbeddingService embeddingService,
                          RedisTemplate<String, Object> redisTemplate,
                          RolePersonaService rolePersonaService,
                          ObjectMapper objectMapper,
                          CompletionService completionService,
                          BriefingMetricsService briefingMetricsService,
                          CfoKpiSnapshotJdbcRepository cfoKpiSnapshotJdbcRepository,
                          SalesKpiSnapshotJdbcRepository salesKpiSnapshotJdbcRepository,
                          OpsKpiSnapshotJdbcRepository opsKpiSnapshotJdbcRepository,
                          @Value("${smartaccounting.ai.completion.provider:anthropic}") String completionProvider,
                          @Value("${smartaccounting.ai.completion.model:claude-sonnet-4-20250514}") String completionModel,
                          @Value("${smartaccounting.ai.completion.api-key:}") String anthropicApiKey,
                          @Value("${smartaccounting.ai.completion.max-tokens:1000}") int completionMaxTokens) {
        this.auditService = auditService;
        this.jdbcTemplate = jdbcTemplate;
        this.embeddingService = embeddingService;
        this.redisTemplate = redisTemplate;
        this.rolePersonaService = rolePersonaService;
        this.objectMapper = objectMapper;
        this.completionService = completionService;
        this.briefingMetricsService = briefingMetricsService;
        this.cfoKpiSnapshotJdbcRepository = cfoKpiSnapshotJdbcRepository;
        this.salesKpiSnapshotJdbcRepository = salesKpiSnapshotJdbcRepository;
        this.opsKpiSnapshotJdbcRepository = opsKpiSnapshotJdbcRepository;
        this.completionProvider = completionProvider;
        this.completionModel = completionModel;
        this.anthropicApiKey = anthropicApiKey;
        this.completionMaxTokens = completionMaxTokens;
        this.anthropicWebClient = WebClient.builder().baseUrl("https://api.anthropic.com").build();
    }

    @PostConstruct
    public void validateConfig() {
        if (!StringUtils.hasText(anthropicApiKey)) {
            log.warn(
                "ANTHROPIC_API_KEY is not set — copilot will use fallback stub responses. "
                    + "Set smartaccounting.ai.completion.api-key to enable real AI."
            );
        }
    }

    /** True when Anthropic completions are configured (not stub/fallback). */
    public boolean isAnthropicConfigured() {
        return useAnthropicCompletion();
    }

    public String completionProviderName() {
        return completionProvider;
    }

    public String completionModelName() {
        return completionModel;
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

    /**
     * Streams answer text deltas for the copilot SSE endpoint (retrieval + audit + Anthropic SSE or local fallback).
     */
    public Flux<String> queryCopilotAnswerStream(String role, String question) {
        UUID tenant = TenantContext.tenantId();
        if (tenant == null) {
            return Flux.error(new IllegalStateException("Tenant context is required"));
        }
        List<Map<String, Object>> docs = retrieveDocs(tenant, role, question, 8);
        auditService.logAction(
            "AI_COPILOT_QUERY",
            "COPILOT_QUERY",
            "{}",
            "{\"role\":\"" + role + "\",\"docCount\":" + docs.size() + ",\"promptVersion\":\"" + PROMPT_VERSION + "\",\"stream\":true}"
        );
        RolePersonaService.Persona persona = rolePersonaService.personaFor(role);
        PersonaProfile profile = PersonaProfile.from(persona);
        List<String> retrievedChunks = docs.stream()
            .map(m -> String.valueOf(m.getOrDefault("content", "")))
            .filter(StringUtils::hasText)
            .toList();
        if (!useAnthropicCompletion()) {
            log.warn(
                "Copilot falling back to stub — provider={}, hasKey={}",
                completionProvider,
                StringUtils.hasText(anthropicApiKey)
            );
            String answer = synthesizeFallback(persona, question, docs, Map.of());
            return Flux.fromArray(answer.split(" ")).map(token -> token + " ");
        }
        return synthesizeStream(question, profile, retrievedChunks, Map.of());
    }

    public List<Map<String, Object>> retrieveDocs(UUID tenantId, String role, String question, int limit) {
        if (!isPgvectorRagAvailable()) {
            return List.of();
        }
        String vec = embeddingService.toPgVectorLiteral(embeddingService.embed(question));
        List<String> allowed = RoleRetrievalPolicy.allowedEntityTypes(role);
        try {
            List<Map<String, Object>> candidates = jdbcTemplate.query("""
                    SELECT entity_type, entity_id::text, content
                    FROM tenant_embeddings
                    WHERE tenant_id = ?
                    ORDER BY embedding <-> CAST(? AS vector)
                    LIMIT 120
                    """,
                (rs, n) -> Map.<String, Object>of(
                    "entityType", rs.getString(1),
                    "entityId", rs.getString(2),
                    "content", rs.getString(3)
                ),
                tenantId,
                vec
            ).stream().filter(m -> allowed.contains(String.valueOf(m.get("entityType")))).toList();
            return rankByLexicalOverlap(candidates, question, Math.max(1, limit));
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private boolean isPgvectorRagAvailable() {
        if (pgvectorRagAvailable != null) {
            return pgvectorRagAvailable;
        }
        synchronized (this) {
            if (pgvectorRagAvailable != null) {
                return pgvectorRagAvailable;
            }
            try {
                pgvectorRagAvailable = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')",
                    Boolean.class
                ));
            } catch (Exception ex) {
                pgvectorRagAvailable = false;
            }
            return pgvectorRagAvailable;
        }
    }

    /**
     * Free second-stage ordering: prefer chunks whose text overlaps question terms, preserving vector order as tiebreaker.
     */
    private static List<Map<String, Object>> rankByLexicalOverlap(
        List<Map<String, Object>> docs,
        String question,
        int limit
    ) {
        if (docs.isEmpty()) {
            return docs;
        }
        if (!StringUtils.hasText(question)) {
            return docs.stream().limit(limit).toList();
        }
        var terms = Arrays.stream(question.toLowerCase(Locale.ROOT).split("\\W+"))
            .filter(t -> t.length() > 2)
            .collect(Collectors.toSet());
        if (terms.isEmpty()) {
            return docs.stream().limit(limit).toList();
        }
        record Scored(Map<String, Object> doc, int score, int index) {}
        List<Scored> scored = new ArrayList<>(docs.size());
        for (int i = 0; i < docs.size(); i++) {
            Map<String, Object> d = docs.get(i);
            String content = String.valueOf(d.getOrDefault("content", "")).toLowerCase(Locale.ROOT);
            int overlap = 0;
            for (String t : terms) {
                if (content.contains(t)) {
                    overlap++;
                }
            }
            int tiebreaker = docs.size() - i;
            scored.add(new Scored(d, overlap * 10_000 + tiebreaker, i));
        }
        scored.sort((a, b) -> {
            int cmp = Integer.compare(b.score(), a.score());
            return cmp != 0 ? cmp : Integer.compare(a.index(), b.index());
        });
        return scored.stream().map(Scored::doc).limit(limit).toList();
    }

    public String synthesize(String role, String question, List<Map<String, Object>> docs, Map<String, Object> toolSignals) {
        RolePersonaService.Persona persona = rolePersonaService.personaFor(role);
        PersonaProfile profile = PersonaProfile.from(persona);
        List<String> retrievedChunks = docs.stream()
            .map(m -> String.valueOf(m.getOrDefault("content", "")))
            .filter(StringUtils::hasText)
            .toList();
        if (useAnthropicCompletion()) {
            return synthesize(question, profile, retrievedChunks, toolSignals);
        }
        return synthesizeFallback(persona, question, docs, toolSignals);
    }

    private boolean useAnthropicCompletion() {
        return "anthropic".equalsIgnoreCase(completionProvider) && StringUtils.hasText(anthropicApiKey);
    }

    /**
     * Single-turn Anthropic Messages completion (non-streaming). Empty when completion is not configured.
     */
    public Optional<String> anthropicSingleTurn(String systemPrompt, String userMessage) {
        return completionService.completeAnthropic(systemPrompt, userMessage);
    }

    public Flux<String> synthesizeStream(
        String question,
        PersonaProfile persona,
        List<String> retrievedChunks,
        Map<String, Object> toolSignals
    ) {
        PromptParts prompts = PromptParts.build(question, persona, retrievedChunks, toolSignals);
        Map<String, Object> request = anthropicRequestBody(true, prompts);

        return anthropicWebClient.post()
            .uri("/v1/messages")
            .header("x-api-key", anthropicApiKey)
            .header("anthropic-version", "2023-06-01")
            .header("Accept", "text/event-stream")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(request)
            .retrieve()
            .bodyToFlux(String.class)
            .concatMap(chunk -> Flux.fromArray(chunk.split("\\r?\\n")))
            .map(String::trim)
            .filter(line -> line.startsWith("data:"))
            .map(line -> line.substring(5).trim())
            .filter(data -> !data.equals("[DONE]"))
            .mapNotNull(data -> {
                try {
                    JsonNode event = objectMapper.readTree(data);
                    if ("content_block_delta".equals(event.path("type").asText())) {
                        String text = event.path("delta").path("text").asText("");
                        if (StringUtils.hasText(text)) {
                            return text;
                        }
                    }
                } catch (Exception ignored) {
                    // ignore malformed or non-JSON SSE payloads
                }
                return null;
            });
    }

    private String synthesize(
        String question,
        PersonaProfile persona,
        List<String> retrievedChunks,
        Map<String, Object> toolSignals
    ) {
        PromptParts prompts = PromptParts.build(question, persona, retrievedChunks, toolSignals);
        return completionService.completeAnthropic(prompts.systemPrompt(), prompts.userMessage())
            .orElseThrow(() -> new IllegalStateException("Anthropic completion is not configured"));
    }

    private LinkedHashMap<String, Object> anthropicRequestBody(boolean stream, PromptParts prompts) {
        LinkedHashMap<String, Object> body = new LinkedHashMap<>();
        body.put("model", completionModel);
        body.put("max_tokens", completionMaxTokens);
        body.put("system", prompts.systemPrompt());
        body.put("messages", List.of(Map.of("role", "user", "content", prompts.userMessage())));
        if (stream) {
            body.put("stream", true);
        }
        return body;
    }

    private String synthesizeFallback(
        RolePersonaService.Persona persona,
        String question,
        List<Map<String, Object>> docs,
        Map<String, Object> toolSignals
    ) {
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
                Object confidence = forecast.get("confidence");
                sb.append(confidence == null ? "n/a" : String.valueOf(confidence));
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
        UUID tenant = TenantContext.tenantId();
        if (tenant == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        RolePersonaService.Persona persona = rolePersonaService.personaFor(role);
        auditService.logAction("AI_QUERY", "COPILOT_WHATIF", "{}", "{\"role\":\"" + role + "\"}");

        String legacyImpact = persona.tone().equals("financial")
            ? "Projected working-capital impact: cash conversion cycle worsens by 5-7 days in the next quarter."
            : "Projected operating impact: target KPI drifts negatively over the next planning horizon.";
        String legacyRecommendation = persona.tone().equals("financial")
            ? "Phase deployment by risk bucket and gate spend commitments until receivables trend stabilizes."
            : "Use phased rollout with measurable checkpoints aligned to role KPIs.";

        LinkedHashMap<String, Object> basedOn = buildWhatIfBasedOnMetrics(tenant);
        String userPrompt = buildWhatIfUserPrompt(persona, scenario, basedOn);
        String systemPrompt = buildWhatIfSystemPrompt(persona);
        String raw = completionService.complete(systemPrompt, userPrompt);
        String impact = legacyImpact;
        String recommendation = legacyRecommendation;
        if (StringUtils.hasText(raw) && !CompletionService.PLACEHOLDER_MESSAGE.equals(raw.trim())) {
            String[] parts = splitImpactAndRecommendation(raw);
            if (StringUtils.hasText(parts[0])) {
                impact = parts[0];
            }
            if (StringUtils.hasText(parts[1])) {
                recommendation = parts[1];
            }
        }

        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        out.put("role", role);
        out.put("persona", persona.label());
        out.put("scenario", scenario);
        out.put("impact", impact);
        out.put("recommendation", recommendation);
        out.put("basedOnMetrics", basedOn);
        out.put("generatedAt", Instant.now().toString());
        return out;
    }

    public Map<String, Object> briefing(String role) {
        UUID tenant = TenantContext.tenantId();
        if (tenant == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        String key = "smartaccounting:" + tenant + ":" + role + ":briefing";
        try {
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached instanceof Map<?, ?> map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> cast = (Map<String, Object>) map;
                return cast;
            }
        } catch (RuntimeException ex) {
            // Redis unavailable; continue without cache.
        }
        RolePersonaService.Persona persona = rolePersonaService.personaFor(role);
        LinkedHashMap<String, Object> metrics = briefingMetricsService.buildBriefingContext(tenant, role);
        String briefingText = roleSpecificBriefing(role);
        String prompt = buildBriefingUserPrompt(persona, metrics);
        String systemPrompt = buildBriefingSystemPrompt(persona);
        String llm = completionService.complete(systemPrompt, prompt);
        if (StringUtils.hasText(llm) && !CompletionService.PLACEHOLDER_MESSAGE.equals(llm.trim())) {
            briefingText = llm.trim();
        }
        Instant now = Instant.now();
        Instant cachedUntil = now.plus(30, ChronoUnit.MINUTES);
        LinkedHashMap<String, Object> response = new LinkedHashMap<>();
        response.put("role", role);
        response.put("persona", persona.label());
        response.put("priorities", persona.priorities());
        response.put("kpiFocus", persona.kpiFocus());
        response.put("briefing", briefingText);
        response.put("metrics", metrics);
        response.put("generatedAt", now.toString());
        response.put("cachedUntil", cachedUntil.toString());
        try {
            redisTemplate.opsForValue().set(key, response, Duration.ofMinutes(30));
        } catch (RuntimeException ex) {
            // Redis unavailable; return uncached response.
        }
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

    private LinkedHashMap<String, Object> buildWhatIfBasedOnMetrics(UUID tenantId) {
        LinkedHashMap<String, Object> m = new LinkedHashMap<>();
        double revenue = 0d;
        double grossMarginRatio = 0d;
        try {
            Optional<String> sales = salesKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (sales.isPresent()) {
                JsonNode n = objectMapper.readTree(sales.get());
                revenue = n.path("grossRevenue").asDouble(0);
                if (revenue <= 0) {
                    revenue = n.path("pipelineValue").asDouble(0);
                }
                double gm = n.path("grossMargin").asDouble(0);
                double gr = n.path("grossRevenue").asDouble(0);
                if (gr > 0) {
                    grossMarginRatio = gm / gr;
                }
            }
        } catch (Exception ignored) {
            // keep zeros
        }
        double cashPosition = 0d;
        double dso = 0d;
        try {
            Optional<String> cfo = cfoKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (cfo.isPresent()) {
                JsonNode n = objectMapper.readTree(cfo.get());
                cashPosition = n.path("ledgerAmount").asDouble(0);
                dso = n.path("dsoDays").asDouble(0);
            }
        } catch (Exception ignored) {
            // keep zeros
        }
        int headcount = safeInt(
            "select count(*) from hr_employee_profiles where tenant_id = ? and upper(status) = 'ACTIVE'",
            tenantId
        );
        if (headcount == 0) {
            headcount = safeInt(
                "select count(*) from hr_employee_profiles where tenant_id = ?",
                tenantId
            );
        }
        int lowStock = 0;
        try {
            Optional<String> ops = opsKpiSnapshotJdbcRepository.findTodayPayload(tenantId);
            if (ops.isPresent()) {
                lowStock = objectMapper.readTree(ops.get()).path("lowStockCount").asInt(0);
            }
        } catch (Exception ignored) {
            // keep zero
        }
        if (lowStock == 0) {
            lowStock = safeInt(
                "select count(*) from inventory_balances where tenant_id = ? and quantity <= 10",
                tenantId
            );
        }
        m.put("revenue", revenue);
        m.put("grossMargin", grossMarginRatio);
        m.put("cashPosition", cashPosition);
        m.put("cashRunwayDays", 0);
        m.put("headcount", headcount);
        m.put("dsoDays", dso);
        m.put("lowStockCount", lowStock);
        return m;
    }

    private String buildWhatIfSystemPrompt(RolePersonaService.Persona persona) {
        return """
            You are %s for a retail business using SmartAccounting ERP.
            Priorities: %s
            KPI focus: %s
            Directive: %s

            Respond with realistic what-if analysis grounded only in the metrics JSON the user provides.
            You MUST format your answer exactly with these two labeled sections (same line as labels):
            IMPACT: <single concise paragraph with quantified effects on revenue, margin, and cash using the given numbers>
            RECOMMENDATION: <single concise paragraph with the top next actions>

            Keep the total under 400 words. Plain English.
            """.formatted(
            persona.label(),
            String.join(", ", persona.priorities()),
            String.join(", ", persona.kpiFocus()),
            persona.directive()
        );
    }

    private String buildWhatIfUserPrompt(
        RolePersonaService.Persona persona,
        String scenario,
        Map<String, Object> basedOn
    ) {
        String metricsJson;
        try {
            metricsJson = objectMapper.writeValueAsString(basedOn);
        } catch (Exception ex) {
            metricsJson = String.valueOf(basedOn);
        }
        return """
            Current tenant metrics (JSON): %s

            Scenario to analyse: %s

            Quantify effects using these figures (currency neutral unless metrics imply scale).
            """.formatted(metricsJson, scenario == null ? "" : scenario);
    }

    private String[] splitImpactAndRecommendation(String raw) {
        if (raw == null || raw.isBlank()) {
            return new String[]{"", ""};
        }
        int imp = indexOfIgnoreCase(raw, "IMPACT:");
        int rec = indexOfIgnoreCase(raw, "RECOMMENDATION:");
        if (imp >= 0 && rec > imp) {
            String impact = stripLabel(raw.substring(imp, rec), "IMPACT:");
            String recommendation = stripLabel(raw.substring(rec), "RECOMMENDATION:");
            return new String[]{impact, recommendation};
        }
        if (rec >= 0 && imp < 0) {
            return new String[]{"", stripLabel(raw.substring(rec), "RECOMMENDATION:")};
        }
        int mid = Math.max(1, raw.length() * 2 / 3);
        return new String[]{raw.substring(0, mid).trim(), raw.substring(mid).trim()};
    }

    private static int indexOfIgnoreCase(String haystack, String needle) {
        return haystack.toLowerCase(Locale.ROOT).indexOf(needle.toLowerCase(Locale.ROOT));
    }

    private static String stripLabel(String segment, String label) {
        String s = segment.trim();
        int idx = indexOfIgnoreCase(s, label);
        if (idx >= 0) {
            s = s.substring(idx + label.length()).trim();
        }
        return s;
    }

    private String buildBriefingSystemPrompt(RolePersonaService.Persona persona) {
        return """
            You are %s for a retail business using SmartAccounting ERP.
            Priorities: %s
            KPI focus: %s
            Directive: %s

            Write a concise daily briefing using only the metrics provided by the user.
            Format exactly:
            1) One sentence headline — the single most important thing right now
            2) Three bullet lines starting with "-" — key numbers needing attention today
            3) One line starting with "Action:" — the single best immediate step

            Plain English, under 150 words total. Use the actual numbers from the metrics list.
            """.formatted(
            persona.label(),
            String.join(", ", persona.priorities()),
            String.join(", ", persona.kpiFocus()),
            persona.directive()
        );
    }

    private String buildBriefingUserPrompt(RolePersonaService.Persona persona, Map<String, Object> metrics) {
        String metricsText = metrics.entrySet().stream()
            .map(e -> "- " + humanizeMetricKey(e.getKey()) + ": " + formatMetricValue(e.getValue()))
            .collect(Collectors.joining("\n"));
        if (metricsText.isBlank()) {
            metricsText = "- (no live metrics available; give a cautious general briefing for this role)";
        }
        return """
            Role context: %s

            Metrics:
            %s
            """.formatted(persona.label(), metricsText);
    }

    private static String humanizeMetricKey(String key) {
        String spaced = key.replaceAll("([A-Z])", " $1").trim();
        return spaced.isEmpty() ? key : Character.toUpperCase(spaced.charAt(0)) + spaced.substring(1);
    }

    private static String formatMetricValue(Object v) {
        if (v == null) {
            return "0";
        }
        if (v instanceof Double d) {
            return String.format(Locale.US, "%.4f", d);
        }
        if (v instanceof java.math.BigDecimal bd) {
            return bd.toPlainString();
        }
        if (v instanceof Float f) {
            return String.format(Locale.US, "%.4f", f.doubleValue());
        }
        return String.valueOf(v);
    }

    private int safeInt(String sql, UUID tenant) {
        try {
            Integer v = jdbcTemplate.queryForObject(sql, Integer.class, tenant);
            return v == null ? 0 : v;
        } catch (Exception ex) {
            return 0;
        }
    }

    public record PersonaProfile(String label, List<String> priorities, List<String> kpiFocus, String directive) {
        public static PersonaProfile from(RolePersonaService.Persona persona) {
            return new PersonaProfile(
                persona.label(),
                new ArrayList<>(persona.priorities()),
                new ArrayList<>(persona.kpiFocus()),
                persona.directive()
            );
        }
    }

    private record PromptParts(String systemPrompt, String userMessage) {
        static PromptParts build(
            String question,
            PersonaProfile persona,
            List<String> retrievedChunks,
            Map<String, Object> toolSignals
        ) {
            String context = String.join("\n\n", retrievedChunks);
            String tools = toolSignals.isEmpty() ? "" :
                "Tool data:\n" + toolSignals.entrySet().stream()
                    .map(e -> e.getKey() + ": " + e.getValue())
                    .collect(Collectors.joining("\n"));

            String systemPrompt = """
                You are %s for SmartAccounting, a retail ERP system.
                Your priorities: %s
                Your KPI focus: %s
                Directive: %s

                Ground every factual claim in the context or tool data below. Do not invent entities, amounts, dates, or policies.
                If the context is insufficient, say what is missing and suggest what the user could look up next—do not guess.
                Be concise, specific, and actionable; prefer short paragraphs or bullets.
                When citing figures, tie them to the snippet they came from (e.g. "per context: …").
                Format currency in FRW or USD as appropriate and consistent with the context.
                """.formatted(
                    persona.label(),
                    String.join(", ", persona.priorities()),
                    String.join(", ", persona.kpiFocus()),
                    persona.directive()
                );

            String userMessage = """
                Question: %s

                Context from business data:
                %s

                %s
                """.formatted(question, context, tools);
            return new PromptParts(systemPrompt, userMessage);
        }
    }
}
