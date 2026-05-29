package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dashboard.DashboardService;
import com.smartaccounting.dto.RecommendedActionDto;
import com.smartaccounting.entity.ActionQueueItem;
import com.smartaccounting.entity.AnomalyCase;
import com.smartaccounting.entity.User;
import com.smartaccounting.repository.ActionQueueItemRepository;
import com.smartaccounting.repository.UserRepository;
import com.smartaccounting.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ActionHubService {
    private static final ZoneId KIGALI = ZoneId.of("Africa/Kigali");

    private final ActionQueueService actionQueueService;
    private final ActionQueueItemRepository actionQueueRepository;
    private final DashboardService dashboardService;
    private final AnomalyCaseService anomalyCaseService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ActionHubService(ActionQueueService actionQueueService,
                            ActionQueueItemRepository actionQueueRepository,
                            DashboardService dashboardService,
                            AnomalyCaseService anomalyCaseService,
                            UserRepository userRepository,
                            ObjectMapper objectMapper) {
        this.actionQueueService = actionQueueService;
        this.actionQueueRepository = actionQueueRepository;
        this.dashboardService = dashboardService;
        this.anomalyCaseService = anomalyCaseService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listHub(String role) {
        requireTenant();
        String normalizedRole = role == null || role.isBlank() ? "cfo" : role.trim().toLowerCase(Locale.ROOT);

        List<Map<String, Object>> pending = new ArrayList<>();
        pending.addAll(queuePendingItems());
        pending.addAll(recommendationItems(normalizedRole));
        pending.addAll(anomalyItems(normalizedRole));

        List<Map<String, Object>> urgent = pending.stream()
            .filter(item -> Boolean.TRUE.equals(item.get("overdue"))
                || "CRITICAL".equals(item.get("priority"))
                || "HIGH".equals(item.get("priority")))
            .toList();

        List<Map<String, Object>> completedToday = completedTodayItems();

        long pendingCount = pending.size();
        long overdueCount = pending.stream().filter(item -> Boolean.TRUE.equals(item.get("overdue"))).count();

        return Map.of(
            "pendingCount", pendingCount,
            "overdueCount", overdueCount,
            "urgent", urgent,
            "pending", pending,
            "completedToday", completedToday
        );
    }

    @Transactional
    public Map<String, Object> processAny(String id, ProcessActionRequest body, String role) {
        if (body == null || body.decision() == null || body.decision().isBlank()) {
            throw new IllegalArgumentException("decision is required");
        }
        String source = body.source() == null ? "" : body.source().trim().toUpperCase(Locale.ROOT);
        if (source.isEmpty()) {
            try {
                UUID queueId = UUID.fromString(id);
                if (repositoryHasQueueItem(queueId)) {
                    return process(queueId, body.decision(), body.reason(), role);
                }
            } catch (IllegalArgumentException ignored) {
                // not a queue UUID — fall through
            }
            throw new IllegalArgumentException("Action item not found; include source (QUEUE, RECOMMENDATION, ANOMALY)");
        }
        return switch (source) {
            case "QUEUE" -> process(UUID.fromString(id), body.decision(), body.reason(), role);
            case "RECOMMENDATION" -> processRecommendation(
                id, body.actionType() != null ? body.actionType() : "EXECUTE", body.decision(), role);
            case "ANOMALY" -> processAnomaly(UUID.fromString(id), body.decision());
            default -> throw new IllegalArgumentException("Unsupported source: " + body.source());
        };
    }

    @Transactional
    public Map<String, Object> process(UUID id, String decision, String reason, String role) {
        String normalized = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if (repositoryHasQueueItem(id)) {
            return switch (normalized) {
                case "APPROVE", "CREATE_PO" -> actionQueueService.approve(id);
                case "REJECT", "DISMISS" -> actionQueueService.reject(id, reason);
                case "MARK_RESOLVED", "INVESTIGATE" -> actionQueueService.reject(id, reason != null ? reason : "Closed from action hub");
                default -> throw new IllegalArgumentException("Unsupported decision: " + decision);
            };
        }
        throw new IllegalArgumentException("Action item not found");
    }

    @Transactional
    public Map<String, Object> processRecommendation(String actionId, String actionType, String decision, String role) {
        String normalized = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if ("DISMISS".equals(normalized) || "REJECT".equals(normalized)) {
            return Map.of("status", "DISMISSED", "id", actionId);
        }
        if ("CREATE_PO".equals(normalized) || "APPROVE".equals(normalized)) {
            String status = dashboardService.executeAction(actionType, actionId);
            return Map.of("status", status, "id", actionId, "type", actionType);
        }
        throw new IllegalArgumentException("Unsupported decision: " + decision);
    }

    @Transactional
    public Map<String, Object> processAnomaly(UUID caseId, String decision) {
        String normalized = decision == null ? "" : decision.trim().toUpperCase(Locale.ROOT);
        if ("MARK_RESOLVED".equals(normalized) || "APPROVE".equals(normalized) || "DISMISS".equals(normalized)) {
            return anomalyCaseService.markReviewed(caseId);
        }
        if ("INVESTIGATE".equals(normalized)) {
            return Map.of("status", "OPEN", "anomalyCaseId", caseId, "viewRoute", "/anomalies/" + caseId);
        }
        throw new IllegalArgumentException("Unsupported decision: " + decision);
    }

    private boolean repositoryHasQueueItem(UUID id) {
        requireTenant();
        return actionQueueRepository.findByIdAndTenantId(id, TenantContext.tenantId()).isPresent();
    }

    private List<Map<String, Object>> queuePendingItems() {
        return actionQueueService.pendingApprovals(0, 100).stream()
            .map(this::enrichQueueItem)
            .toList();
    }

    private Map<String, Object> enrichQueueItem(Map<String, Object> approval) {
        Map<String, Object> item = new LinkedHashMap<>(approval);
        Object id = approval.get("id");
        ActionQueueItem row = null;
        if (id instanceof UUID uuid) {
            row = actionQueueRepository.findByIdAndTenantId(uuid, requireTenant()).orElse(null);
        }
        String actionType = row != null ? row.getActionType() : String.valueOf(approval.get("requestedAction"));
        if (row != null && row.getPreviewTitle() != null && !row.getPreviewTitle().isBlank()) {
            item.put("title", row.getPreviewTitle());
        }
        item.put("source", "QUEUE");
        item.put("category", categorize(actionType, row != null ? row.getPreviewTitle() : null));
        item.put("categoryLabel", categoryLabel(String.valueOf(item.get("category"))));
        item.put("priority", inferPriority(row, actionType));
        item.put("overdue", isOverdue(row));
        item.put("lines", buildQueueLines(row, approval));
        item.put("meta", buildMeta(row));
        item.put("viewRoute", viewRouteFor(actionType, row));
        if (row != null && row.getRequestedBy() != null) {
            item.put("requestedBy", userRepository.findById(row.getRequestedBy())
                .map(User::getUsername)
                .orElse("User"));
        }
        Map<String, Object> payload = row != null ? parsePayload(row.getPayload()) : Map.of();
        if (payload.get("requestedByName") != null) {
            item.put("requestedBy", String.valueOf(payload.get("requestedByName")));
        }
        if (row != null && row.getCreatedAt() != null) {
            item.put("createdAt", String.valueOf(row.getCreatedAt()));
        }
        return item;
    }

    private List<Map<String, Object>> recommendationItems(String role) {
        List<RecommendedActionDto> actions = dashboardService.actions(role);
        List<Map<String, Object>> out = new ArrayList<>();
        for (RecommendedActionDto dto : actions) {
            String category = categorize(dto.type(), dto.label());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", dto.id());
            item.put("source", "RECOMMENDATION");
            item.put("category", category);
            item.put("categoryLabel", categoryLabel(category));
            item.put("requestedAction", dto.label());
            item.put("title", dto.label());
            item.put("summary", dto.label());
            item.put("priority", priorityFromImpact(dto.impact()));
            item.put("overdue", false);
            item.put("status", "PENDING");
            item.put("actionType", dto.type());
            item.put("lines", buildRecommendationLines(dto));
            item.put("meta", dto.impact());
            item.put("createdAt", String.valueOf(Instant.now()));
            item.put("viewRoute", routeFromImpact(dto.impact()));
            out.add(item);
        }
        return out;
    }

    private List<Map<String, Object>> anomalyItems(String role) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (AnomalyCase c : anomalyCaseService.listOpen(role, 0, 15)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", c.getId());
            item.put("source", "ANOMALY");
            item.put("category", "ANOMALY");
            item.put("categoryLabel", categoryLabel("ANOMALY"));
            item.put("requestedAction", c.getTitle());
            item.put("title", c.getTitle());
            item.put("summary", c.getDetails());
            item.put("priority", severityToPriority(c.getSeverity()));
            item.put("overdue", "CRITICAL".equalsIgnoreCase(c.getSeverity()));
            item.put("status", "PENDING");
            item.put("lines", buildAnomalyLines(c));
            item.put("meta", c.getKpiName() != null ? "KPI: " + c.getKpiName() : "");
            item.put("viewRoute", "/anomalies/" + c.getId());
            item.put("createdAt", String.valueOf(c.getCreatedAt()));
            out.add(item);
        }
        return out;
    }

    private List<Map<String, Object>> completedTodayItems() {
        Instant startOfDay = LocalDate.now(KIGALI).atStartOfDay(KIGALI).toInstant();
        UUID tenantId = requireTenant();
        return actionQueueRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, PageRequest.of(0, 100)).stream()
            .filter(item -> {
                Instant marker = item.getProcessedAt() != null ? item.getProcessedAt() : item.getApprovalDecidedAt();
                return marker != null && !marker.isBefore(startOfDay)
                    && (List.of("PROCESSED", "REJECTED", "APPROVED", "UNDONE").contains(item.getStatus())
                    || List.of("APPROVED", "REJECTED").contains(item.getApprovalStatus()));
            })
            .limit(25)
            .map(this::toCompletedItem)
            .toList();
    }

    private Map<String, Object> toCompletedItem(ActionQueueItem item) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", item.getId());
        out.put("source", "QUEUE");
        out.put("category", categorize(item.getActionType(), null));
        out.put("categoryLabel", categoryLabel(String.valueOf(out.get("category"))));
        out.put("title", item.getPreviewTitle() != null ? item.getPreviewTitle() : item.getActionType());
        out.put("status", item.getStatus());
        out.put("summary", item.getResultSummary() != null ? item.getResultSummary() : item.getPreviewSummary());
        out.put("processedAt", String.valueOf(item.getProcessedAt() != null ? item.getProcessedAt() : item.getApprovalDecidedAt()));
        return out;
    }

    private String categorize(String actionType, String label) {
        String hay = ((actionType == null ? "" : actionType) + " " + (label == null ? "" : label)).toUpperCase(Locale.ROOT);
        if (hay.contains("PURCHASE") || hay.contains("PO") || hay.contains("DRAFT_PURCHASE")) {
            return "PURCHASE_ORDER";
        }
        if (hay.contains("REORDER") || hay.contains("LOW_STOCK") || hay.contains("CREATE_PO") || hay.contains("create-po")
            || hay.contains("REORDER_SUGGESTION")) {
            return "REORDER";
        }
        if (hay.contains("ANOMALY") || hay.contains("VOID") || hay.contains("SHRINKAGE")) {
            return "ANOMALY";
        }
        return "OTHER";
    }

    private static String categoryLabel(String category) {
        return switch (category) {
            case "PURCHASE_ORDER" -> "Purchase order approval";
            case "REORDER" -> "Reorder suggestion";
            case "ANOMALY" -> "Anomaly review";
            default -> "Action";
        };
    }

    private String inferPriority(ActionQueueItem row, String actionType) {
        if (row != null && row.getWarningMessage() != null && row.getWarningMessage().toLowerCase(Locale.ROOT).contains("critical")) {
            return "CRITICAL";
        }
        String hay = actionType == null ? "" : actionType.toUpperCase(Locale.ROOT);
        if (hay.contains("ESCALATE") || hay.contains("WRITE_OFF")) {
            return "HIGH";
        }
        return "MEDIUM";
    }

    private String priorityFromImpact(String impact) {
        if (impact == null) {
            return "MEDIUM";
        }
        String first = impact.split("\\|")[0].trim().toUpperCase(Locale.ROOT);
        if (first.equals("CRITICAL") || first.equals("HIGH") || first.equals("MEDIUM") || first.equals("LOW")) {
            return first;
        }
        return "MEDIUM";
    }

    private String severityToPriority(String severity) {
        if (severity == null) {
            return "MEDIUM";
        }
        return switch (severity.toUpperCase(Locale.ROOT)) {
            case "CRITICAL" -> "CRITICAL";
            case "HIGH" -> "HIGH";
            case "LOW" -> "LOW";
            default -> "MEDIUM";
        };
    }

    private boolean isOverdue(ActionQueueItem row) {
        if (row == null || row.getApprovalExpiresAt() == null) {
            return false;
        }
        return row.getApprovalExpiresAt().isBefore(Instant.now());
    }

    private List<String> buildRecommendationLines(RecommendedActionDto dto) {
        List<String> lines = new ArrayList<>();
        String label = dto.label() == null ? "" : dto.label();
        int sep = label.indexOf(" — ");
        if (sep >= 0) {
            lines.add(label.substring(sep + 3).trim());
        } else {
            lines.add(label);
        }
        String impact = dto.impact() == null ? "" : dto.impact();
        for (String part : impact.split("\\|")) {
            String trimmed = part.trim();
            if (!trimmed.startsWith("route:") && !trimmed.startsWith("api:")
                && !trimmed.equalsIgnoreCase("HIGH")
                && !trimmed.equalsIgnoreCase("MEDIUM")
                && !trimmed.equalsIgnoreCase("LOW")
                && !trimmed.equalsIgnoreCase("CRITICAL")) {
                lines.add(trimmed);
            }
        }
        return lines.isEmpty() ? List.of(label) : lines;
    }

    @SuppressWarnings("unchecked")
    private List<String> buildQueueLines(ActionQueueItem row, Map<String, Object> approval) {
        List<String> lines = new ArrayList<>();
        if (row != null) {
            Map<String, Object> payload = parsePayload(row.getPayload());
            if (payload.containsKey("productName")) {
                Object qty = payload.get("quantity") != null ? payload.get("quantity") : payload.get("suggestedQuantity");
                String unit = payload.get("unit") != null ? " " + payload.get("unit") : "";
                lines.add(qty != null
                    ? payload.get("productName") + " × " + qty + unit
                    : String.valueOf(payload.get("productName")));
            }
            if (payload.containsKey("currentStock") && payload.containsKey("reorderPoint")) {
                lines.add("Current stock: " + payload.get("currentStock") + " units (below " + payload.get("reorderPoint") + ")");
            }
            if (payload.containsKey("suggestedQuantity") && payload.containsKey("supplierName")) {
                lines.add("Suggested: " + payload.get("suggestedQuantity") + " units from " + payload.get("supplierName"));
            }
            if (payload.containsKey("supplierName") && !payload.containsKey("suggestedQuantity")) {
                lines.add("Supplier: " + payload.get("supplierName"));
            }
            if (payload.containsKey("supplier")) {
                lines.add("Supplier: " + payload.get("supplier"));
            }
            if (payload.containsKey("totalAmountRwf")) {
                lines.add("Total: RWF " + payload.get("totalAmountRwf"));
            }
            if (payload.containsKey("amount")) {
                lines.add("Amount: RWF " + payload.get("amount"));
            }
            if (payload.containsKey("customer")) {
                lines.add("Customer: " + payload.get("customer"));
            }
            if (payload.containsKey("daysOverdue")) {
                lines.add("Days overdue: " + payload.get("daysOverdue"));
            }
            if (payload.containsKey("lotCode")) {
                lines.add("Lot " + payload.get("lotCode") + " · qty " + payload.get("quantity"));
            }
        }
        if (lines.isEmpty() && approval.get("summary") != null) {
            lines.add(String.valueOf(approval.get("summary")));
        }
        if (lines.isEmpty() && approval.get("requestedAction") != null) {
            lines.add(String.valueOf(approval.get("requestedAction")));
        }
        return lines;
    }

    private String buildMeta(ActionQueueItem row) {
        if (row == null || row.getCreatedAt() == null) {
            return "";
        }
        return "Queued " + row.getCreatedAt();
    }

    private List<String> buildAnomalyLines(AnomalyCase c) {
        List<String> lines = new ArrayList<>();
        if (c.getDetails() != null && !c.getDetails().isBlank()) {
            lines.add(c.getDetails());
        }
        if (c.getCurrentValue() != null && c.getExpectedRange() != null) {
            String kpi = c.getKpiName() != null && c.getKpiName().contains("void")
                ? c.getCurrentValue() + " voids today vs avg " + c.getExpectedRange()
                : "Current " + c.getCurrentValue() + " vs expected " + c.getExpectedRange();
            lines.add(kpi);
        }
        parseContributors(c.getContributorsJson()).forEach(lines::add);
        if (c.getZScore() != null && lines.size() < 3) {
            lines.add("z-score " + c.getZScore());
        }
        return lines;
    }

    @SuppressWarnings("unchecked")
    private List<String> parseContributors(String json) {
        List<String> lines = new ArrayList<>();
        if (json == null || json.isBlank()) {
            return lines;
        }
        try {
            Object parsed = objectMapper.readValue(json, Object.class);
            if (parsed instanceof List<?> list && !list.isEmpty() && list.get(0) instanceof Map<?, ?> first) {
                Map<String, Object> map = new LinkedHashMap<>();
                first.forEach((k, v) -> map.put(String.valueOf(k), v));
                if (map.containsKey("register")) {
                    lines.add("Register: " + map.get("register"));
                }
                if (map.containsKey("cashier")) {
                    lines.add("Cashier: " + map.get("cashier"));
                }
                if (map.containsKey("voidCountToday") && map.containsKey("voidAvg")) {
                    lines.add(map.get("voidCountToday") + " voids today vs avg " + map.get("voidAvg"));
                }
            }
        } catch (Exception ignored) {
        }
        return lines;
    }

    private String viewRouteFor(String actionType, ActionQueueItem row) {
        if (actionType != null && (actionType.contains("PURCHASE") || actionType.contains("REORDER"))) {
            return "/procurement/purchase-orders";
        }
        if (row != null && row.getResultEntityId() != null) {
            return null;
        }
        return null;
    }

    private String routeFromImpact(String impact) {
        if (impact == null) {
            return null;
        }
        for (String part : impact.split("\\|")) {
            String trimmed = part.trim();
            if (trimmed.startsWith("route:")) {
                return trimmed.substring(6).trim();
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePayload(String json) {
        try {
            Object parsed = objectMapper.readValue(json == null ? "{}" : json, Object.class);
            if (parsed instanceof Map<?, ?> map) {
                Map<String, Object> out = new LinkedHashMap<>();
                map.forEach((k, v) -> out.put(String.valueOf(k), v));
                return out;
            }
        } catch (Exception ignored) {
        }
        return Map.of();
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) {
            throw new IllegalStateException("Tenant context is required");
        }
        return TenantContext.tenantId();
    }
}
