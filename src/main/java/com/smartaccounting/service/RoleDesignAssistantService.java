package com.smartaccounting.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.copilot.CompletionService;
import com.smartaccounting.dto.rbac.CustomPermissionProposal;
import com.smartaccounting.dto.rbac.DesignRoleRequest;
import com.smartaccounting.dto.rbac.RoleProfileConfig;
import com.smartaccounting.dto.rbac.RoleDesignSuggestionResponse;
import com.smartaccounting.dto.rbac.RoleDraftSuggestion;
import com.smartaccounting.dto.rbac.SimilarRoleHint;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.entity.Role;
import com.smartaccounting.repository.PermissionRepository;
import com.smartaccounting.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RoleDesignAssistantService {
    private static final List<String> ALL_WRITE_MARKERS = List.of(
        "FINANCE_WRITE", "INVENTORY_WRITE", "PROCUREMENT_WRITE", "HR_WRITE", "PAYROLL_WRITE",
        "POS_DISCOUNT", "POS_RETURNS", "INVENTORY_SHRINKAGE", "FINANCE_CLOSE", "ROLE_MANAGE",
        "USER_MANAGE", "TENANT_CONFIG", "EBM_CONFIG"
    );

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionSuggestionService rolePermissionSuggestionService;
    private final TenantCustomPermissionService tenantCustomPermissionService;
    private final CompletionService completionService;
    private final ObjectMapper objectMapper;
    private final RoleProfileService roleProfileService;

    public RoleDesignAssistantService(
        RoleRepository roleRepository,
        PermissionRepository permissionRepository,
        RolePermissionSuggestionService rolePermissionSuggestionService,
        TenantCustomPermissionService tenantCustomPermissionService,
        CompletionService completionService,
        ObjectMapper objectMapper,
        RoleProfileService roleProfileService
    ) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.rolePermissionSuggestionService = rolePermissionSuggestionService;
        this.tenantCustomPermissionService = tenantCustomPermissionService;
        this.completionService = completionService;
        this.objectMapper = objectMapper;
        this.roleProfileService = roleProfileService;
    }

    @Transactional
    public RoleDesignSuggestionResponse design(UUID tenantId, DesignRoleRequest request) {
        String prompt = request.prompt().trim();
        List<Permission> platformCatalog = permissionRepository.findAll().stream()
            .filter(permission -> permission.getTenantId() == null)
            .toList();
        Set<String> catalogCodes = platformCatalog.stream()
            .map(Permission::getCode)
            .collect(Collectors.toCollection(LinkedHashSet::new));

        List<Role> existingRoles = roleRepository.findAllByTenantId(tenantId).stream()
            .filter(role -> !role.isOwner())
            .toList();

        Optional<Role> explicitBase = request.baseRoleId() == null
            ? Optional.empty()
            : roleRepository.findByIdAndTenantId(request.baseRoleId(), tenantId);

        Optional<Role> inferredBase = explicitBase.isPresent()
            ? explicitBase
            : findBestNameMatch(prompt, existingRoles);

        List<String> baseCodes = inferredBase
            .map(role -> role.getPermissions().stream().map(Permission::getCode).sorted().toList())
            .orElse(List.of());

        String roleName = extractRoleName(prompt);
        List<String> heuristicCodes = applyPromptModifiers(
            rolePermissionSuggestionService.suggest(roleName),
            prompt,
            baseCodes,
            catalogCodes
        );

        boolean aiEnhanced = false;
        RoleDraftSuggestion suggested = buildDraft(roleName, prompt, heuristicCodes, inferredBase, List.of());
        List<String> unsupported = detectUnsupported(prompt, catalogCodes);
        List<CapabilityRequest> capabilityRequests = extractCustomCapabilities(prompt, platformCatalog, catalogCodes);

        Optional<LlmDesignPayload> llmPayload = tryLlmPayload(prompt, catalogCodes, existingRoles, inferredBase);
        if (llmPayload.isPresent()) {
            LlmDesignPayload payload = llmPayload.get();
            suggested = new RoleDraftSuggestion(
                payload.name(),
                payload.description(),
                payload.emoji(),
                payload.colour(),
                payload.platformCodes().stream().filter(catalogCodes::contains).toList(),
                List.of(),
                RoleProfileConfig.empty()
            );
            capabilityRequests = mergeCapabilities(capabilityRequests, payload.customCapabilities());
            aiEnhanced = true;
        }

        List<CustomPermissionProposal> customProposals = provisionCustomPermissions(tenantId, capabilityRequests);
        List<String> customCodes = customProposals.stream().map(CustomPermissionProposal::code).toList();
        List<String> platformOnly = suggested.permissionCodes().stream().filter(catalogCodes::contains).toList();
        List<String> allCodes = new ArrayList<>(platformOnly);
        allCodes.addAll(customCodes);

        RoleProfileConfig profile = roleProfileService.resolveForPersist(
            suggested.roleProfile(),
            allCodes,
            suggested.name(),
            aiEnhanced ? "AI_ASSISTED" : "ADMIN_AUTHORED"
        ).profile();
        RoleDraftSuggestion finalSuggested = new RoleDraftSuggestion(
            suggested.name(),
            suggested.description(),
            suggested.emoji(),
            suggested.colour(),
            platformOnly,
            customCodes,
            profile
        );

        String matchType = resolveMatchType(prompt, finalSuggested, existingRoles, inferredBase);
        List<SimilarRoleHint> similar = rankSimilarRoles(allCodes, existingRoles, inferredBase);

        String summary = buildSummary(matchType, finalSuggested, inferredBase, customProposals.size());
        String reasoning = buildReasoning(matchType, prompt, finalSuggested, inferredBase, unsupported, aiEnhanced, customProposals);

        return new RoleDesignSuggestionResponse(
            matchType,
            unsupported.isEmpty(),
            summary,
            reasoning,
            finalSuggested,
            inferredBase.map(Role::getId).orElse(null),
            inferredBase.map(Role::getName).orElse(null),
            similar,
            customProposals,
            unsupported,
            aiEnhanced
        );
    }

    private record CapabilityRequest(
        String label,
        String description,
        String category,
        List<String> optionalGrants
    ) {}

    private record LlmDesignPayload(
        String name,
        String description,
        String emoji,
        String colour,
        List<String> platformCodes,
        List<CapabilityRequest> customCapabilities
    ) {}

    private Optional<LlmDesignPayload> tryLlmPayload(
        String prompt,
        Set<String> catalogCodes,
        List<Role> existingRoles,
        Optional<Role> baseRole
    ) {
        String roleCatalog = permissionRepository.findAll().stream()
            .sorted(Comparator
                .comparing(Permission::getCategory, Comparator.nullsLast(String::compareToIgnoreCase))
                .thenComparing(Permission::getCode, Comparator.nullsLast(String::compareToIgnoreCase)))
            .map(p -> p.getCode() + " (" + p.getLabel() + ")")
            .collect(Collectors.joining(", "));

        String existing = existingRoles.stream()
            .map(r -> r.getName() + ": " + r.getPermissions().stream().map(Permission::getCode).collect(Collectors.joining(",")))
            .collect(Collectors.joining("\n"));

        String system = """
            You design RBAC roles for SmartAccounting Rwanda ERP.
            Reply with ONLY valid JSON (no markdown):
            {"name":"...","description":"...","emoji":"single emoji","colour":"#hex","permissionCodes":["CODE",...],"customCapabilities":[{"label":"human label","description":"what they can do","category":"CUSTOM","optionalGrants":["CODE"]}]}
            Rules:
            - permissionCodes MUST be chosen only from the provided catalog codes.
            - Put capabilities with NO catalog equivalent in customCapabilities (exact label the CEO asked for).
            - Do NOT substitute customCapabilities into permissionCodes.
            - Use optionalGrants to recommend which existing system permissions should be preselected for each custom capability.
            - Never include owner-only escalation (do not grant all permissions unless explicitly asked for owner).
            - Prefer least privilege; add WRITE only when the prompt implies approval/edit powers.
            - If the request matches an existing role with tweaks, still return a distinct name (e.g. "Junior Accountant").
            """;

        String user = "Catalog: " + roleCatalog
            + "\nExisting roles:\n" + (existing.isBlank() ? "(none)" : existing)
            + (baseRole.map(r -> "\nFork from role: " + r.getName()).orElse(""))
            + "\nCEO request: " + prompt;

        return completionService.completeAnthropic(system, user).flatMap(raw -> parseLlmPayload(raw, catalogCodes));
    }

    private Optional<LlmDesignPayload> parseLlmPayload(String raw, Set<String> catalogCodes) {
        try {
            String json = raw.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("(?s)^```json?\\s*", "").replaceAll("```\\s*$", "").trim();
            }
            JsonNode node = objectMapper.readTree(json);
            String name = node.path("name").asText("").trim();
            if (!StringUtils.hasText(name)) {
                return Optional.empty();
            }
            List<String> codes = new ArrayList<>();
            node.path("permissionCodes").forEach(c -> {
                String code = c.asText("").trim().toUpperCase(Locale.ROOT);
                if (catalogCodes.contains(code)) {
                    codes.add(code);
                }
            });
            List<CapabilityRequest> custom = parseCustomCapabilities(node.path("customCapabilities"), catalogCodes);
            return Optional.of(new LlmDesignPayload(
                name,
                node.path("description").asText("").trim(),
                node.path("emoji").asText("🎯").trim(),
                node.path("colour").asText("#6366f1").trim(),
                codes.stream().distinct().toList(),
                custom
            ));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private List<CapabilityRequest> parseCustomCapabilities(JsonNode array, Set<String> catalogCodes) {
        if (array == null || !array.isArray()) {
            return List.of();
        }
        List<CapabilityRequest> results = new ArrayList<>();
        array.forEach(item -> {
            String label = item.path("label").asText("").trim();
            if (!label.isBlank()) {
                List<String> optionalGrants = new ArrayList<>();
                item.path("optionalGrants").forEach(grant -> {
                    String code = grant.asText("").trim().toUpperCase(Locale.ROOT);
                    if (catalogCodes.contains(code)) {
                        optionalGrants.add(code);
                    }
                });
                results.add(new CapabilityRequest(
                    label,
                    item.path("description").asText(label).trim(),
                    item.path("category").asText("CUSTOM").trim(),
                    optionalGrants.stream().distinct().toList()
                ));
            }
        });
        return results;
    }

    private List<CapabilityRequest> extractCustomCapabilities(
        String prompt,
        List<Permission> platformCatalog,
        Set<String> catalogCodes
    ) {
        List<CapabilityRequest> results = new ArrayList<>();
        String lower = prompt.toLowerCase(Locale.ROOT);

        for (String segment : splitCapabilitySegments(prompt)) {
            if (segment.length() < 8 || matchesCatalog(segment, platformCatalog)) {
                continue;
            }
            if (containsAny(lower, "owner", "full access", "everything")) {
                continue;
            }
            results.add(new CapabilityRequest(
                segment,
                segment,
                "CUSTOM",
                recommendPlatformGrants(segment, prompt, platformCatalog, catalogCodes)
            ));
        }

        if (results.isEmpty() && containsAny(lower, "approve", "rebate", "refund", "social media", "tiktok", "instagram")) {
            for (String keyword : List.of("approve supplier refunds", "approve credit notes", "manage social media", "vendor rebates")) {
                if (lower.contains(keyword) && !matchesCatalog(keyword, platformCatalog)) {
                    results.add(new CapabilityRequest(
                        capitalize(keyword),
                        "Requested in role description: " + keyword,
                        "CUSTOM",
                        recommendPlatformGrants(keyword, prompt, platformCatalog, catalogCodes)
                    ));
                }
            }
        }
        return dedupeCapabilities(results);
    }

    private List<CustomPermissionProposal> provisionCustomPermissions(
        UUID tenantId,
        List<CapabilityRequest> capabilities
    ) {
        List<CustomPermissionProposal> proposals = new ArrayList<>();
        for (CapabilityRequest capability : capabilities) {
            Permission created = tenantCustomPermissionService.ensureCustomPermission(
                tenantId,
                capability.label(),
                capability.description(),
                capability.category(),
                capability.optionalGrants()
            );
            proposals.add(new CustomPermissionProposal(
                created.getCode(),
                created.getLabel(),
                created.getDescription(),
                created.getCategory(),
                capability.optionalGrants(),
                true
            ));
        }
        return proposals;
    }

    private static List<CapabilityRequest> mergeCapabilities(
        List<CapabilityRequest> primary,
        List<CapabilityRequest> extra
    ) {
        List<CapabilityRequest> merged = new ArrayList<>(primary);
        merged.addAll(extra);
        return dedupeCapabilities(merged);
    }

    private static List<CapabilityRequest> dedupeCapabilities(List<CapabilityRequest> input) {
        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<CapabilityRequest> out = new ArrayList<>();
        for (CapabilityRequest request : input) {
            String key = request.label().trim().toLowerCase(Locale.ROOT);
            if (key.isBlank()) {
                continue;
            }
            if (seen.add(key)) {
                out.add(request);
            } else {
                for (int i = 0; i < out.size(); i++) {
                    CapabilityRequest existing = out.get(i);
                    String existingKey = existing.label().trim().toLowerCase(Locale.ROOT);
                    if (existingKey.equals(key)) {
                        LinkedHashSet<String> mergedGrants = new LinkedHashSet<>(existing.optionalGrants());
                        mergedGrants.addAll(request.optionalGrants());
                        out.set(i, new CapabilityRequest(
                            existing.label(),
                            existing.description(),
                            existing.category(),
                            new ArrayList<>(mergedGrants)
                        ));
                        break;
                    }
                }
            }
        }
        return out;
    }

    private static List<String> splitCapabilitySegments(String prompt) {
        String normalized = prompt.replace("—", ",").replace("–", ",");
        String[] parts = normalized.split("[,;]|\\bbut\\b|\\bexcept\\b|\\bwithout\\b|\\band also\\b");
        List<String> segments = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (trimmed.startsWith("can ")) {
                trimmed = trimmed.substring(4).trim();
            } else if (trimmed.startsWith("cannot ")) {
                continue;
            }
            if (trimmed.length() >= 8) {
                segments.add(trimmed);
            }
        }
        return segments;
    }

    private static boolean matchesCatalog(String phrase, List<Permission> platformCatalog) {
        String lower = phrase.toLowerCase(Locale.ROOT);
        int overlap = 0;
        for (Permission permission : platformCatalog) {
            String label = permission.getLabel() == null ? "" : permission.getLabel().toLowerCase(Locale.ROOT);
            for (String token : label.split("\\s+")) {
                if (token.length() > 3 && lower.contains(token)) {
                    overlap++;
                }
            }
            String code = permission.getCode().toLowerCase(Locale.ROOT).replace('_', ' ');
            if (lower.contains(code)) {
                overlap += 2;
            }
        }
        return overlap >= 2;
    }

    private static String capitalize(String value) {
        if (value.isBlank()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private List<String> recommendPlatformGrants(
        String capabilityText,
        String fullPrompt,
        List<Permission> platformCatalog,
        Set<String> catalogCodes
    ) {
        LinkedHashSet<String> recommended = new LinkedHashSet<>();
        String text = (capabilityText + " " + fullPrompt).toLowerCase(Locale.ROOT);

        if (containsAny(text, "approve", "refund", "credit note", "rebate", "invoice", "payment")) {
            recommended.add("FINANCE_READ");
            recommended.add("FINANCE_WRITE");
        }
        if (containsAny(text, "close", "period close", "month end")) {
            recommended.add("FINANCE_CLOSE");
        }
        if (containsAny(text, "stock", "inventory", "warehouse", "batch")) {
            recommended.add("INVENTORY_READ");
            if (containsAny(text, "adjust", "edit", "update", "approve")) {
                recommended.add("INVENTORY_WRITE");
            }
        }
        if (containsAny(text, "purchase", "procure", "supplier")) {
            recommended.add("PROCUREMENT_READ");
            if (containsAny(text, "approve", "create", "edit", "issue")) {
                recommended.add("PROCUREMENT_WRITE");
            }
        }
        if (containsAny(text, "payroll", "salary", "staff")) {
            recommended.add("PAYROLL_READ");
            recommended.add("HR_READ");
            if (containsAny(text, "approve", "edit", "run")) {
                recommended.add("PAYROLL_WRITE");
            }
        }
        if (containsAny(text, "cashier", "till", "checkout", "receipt")) {
            recommended.add("POS_ACCESS");
            recommended.add("POS_TILL_MANAGE");
            recommended.add("EBM_SUBMIT");
        }
        if (containsAny(text, "social media", "campaign", "promotion", "tiktok", "instagram")) {
            recommended.add("ANALYTICS_ALL");
            recommended.add("REPORTS_EXPORT");
        }
        if (containsAny(text, "report", "export", "dashboard")) {
            recommended.add("REPORTS_EXPORT");
            recommended.add("ANALYTICS_OWN");
        }

        if (recommended.isEmpty()) {
            recommended.addAll(
                platformCatalog.stream()
                    .filter(permission -> scoreCapabilityAgainstPermission(text, permission) >= 2)
                    .sorted(Comparator.comparingInt((Permission permission) -> scoreCapabilityAgainstPermission(text, permission)).reversed())
                    .map(Permission::getCode)
                    .limit(3)
                    .toList()
            );
        }

        return recommended.stream()
            .filter(catalogCodes::contains)
            .distinct()
            .toList();
    }

    private static int scoreCapabilityAgainstPermission(String text, Permission permission) {
        int score = 0;
        String label = permission.getLabel() == null ? "" : permission.getLabel().toLowerCase(Locale.ROOT);
        String code = permission.getCode() == null ? "" : permission.getCode().toLowerCase(Locale.ROOT).replace('_', ' ');

        for (String token : label.split("\\s+")) {
            if (token.length() > 2 && text.contains(token)) {
                score += 2;
            }
        }
        for (String token : code.split("\\s+")) {
            if (token.length() > 2 && text.contains(token)) {
                score += 1;
            }
        }
        return score;
    }

    private static List<String> applyPromptModifiers(
        List<String> seed,
        String prompt,
        List<String> baseCodes,
        Set<String> catalogCodes
    ) {
        LinkedHashSet<String> codes = new LinkedHashSet<>();
        if (!baseCodes.isEmpty()) {
            codes.addAll(baseCodes);
        } else {
            codes.addAll(seed);
        }

        String lower = prompt.toLowerCase(Locale.ROOT);

        if (containsAny(lower, "read only", "read-only", "view only", "cannot edit", "no edit", "just view")) {
            codes.removeIf(code -> code.endsWith("_WRITE") || ALL_WRITE_MARKERS.contains(code));
        }
        if (containsAny(lower, "junior", "assistant", "trainee", "entry")) {
            codes.removeAll(ALL_WRITE_MARKERS);
            codes.remove("ROLE_MANAGE");
            codes.remove("USER_MANAGE");
            codes.remove("TENANT_CONFIG");
            codes.remove("FINANCE_CLOSE");
            codes.remove("PAYROLL_WRITE");
        }
        if (containsAny(lower, "senior", "head of", "lead", "supervisor")) {
            if (codes.contains("FINANCE_READ")) {
                codes.add("FINANCE_WRITE");
            }
            if (codes.contains("INVENTORY_READ")) {
                codes.add("INVENTORY_WRITE");
            }
            if (codes.contains("PROCUREMENT_READ")) {
                codes.add("PROCUREMENT_WRITE");
            }
            codes.add("REPORTS_EXPORT");
        }
        if (containsAny(lower, "no payroll", "without payroll")) {
            codes.remove("PAYROLL_READ");
            codes.remove("PAYROLL_WRITE");
        }
        if (containsAny(lower, "no invite", "cannot invite", "no hiring")) {
            codes.remove("STAFF_INVITE");
            codes.remove("USER_MANAGE");
        }
        if (containsAny(lower, "cashier", "till", "pos only", "checkout")) {
            codes.clear();
            codes.addAll(List.of("POS_ACCESS", "POS_TILL_MANAGE", "EBM_SUBMIT"));
        }
        if (containsAny(lower, "copilot", "ai assist")) {
            codes.add("AI_COPILOT");
        }
        if (containsAny(lower, "manage roles", "create roles")) {
            codes.add("ROLE_MANAGE");
        }
        if (containsAny(lower, "manage users", "invite staff")) {
            codes.add("USER_MANAGE");
            codes.add("STAFF_INVITE");
        }

        return codes.stream().filter(catalogCodes::contains).distinct().toList();
    }

    private static RoleDraftSuggestion buildDraft(
        String roleName,
        String prompt,
        List<String> codes,
        Optional<Role> baseRole,
        List<String> customCodes
    ) {
        String name = StringUtils.hasText(roleName) ? roleName : "Custom role";
        String description = prompt.length() > 120 ? prompt.substring(0, 117) + "…" : prompt;
        String emoji = baseRole.map(Role::getEmoji).filter(StringUtils::hasText).orElse(pickEmoji(name));
        String colour = baseRole.map(Role::getColour).filter(StringUtils::hasText).orElse("#6366f1");
        return new RoleDraftSuggestion(name, description, emoji, colour, codes, customCodes, RoleProfileConfig.empty());
    }

    private static String extractRoleName(String prompt) {
        String trimmed = prompt.trim();
        String lower = trimmed.toLowerCase(Locale.ROOT);

        for (String prefix : List.of("role called ", "role named ", "create ", "add ", "need a ", "want a ")) {
            if (lower.startsWith(prefix)) {
                String rest = trimmed.substring(prefix.length()).trim();
                int stop = indexOfAny(rest, " who ", " that ", " with ", " can ", " — ", " - ");
                return stop > 0 ? rest.substring(0, stop).trim() : firstClause(rest);
            }
        }

        int who = lower.indexOf(" who ");
        if (who > 3 && who < 60) {
            return trimmed.substring(0, who).trim();
        }
        return firstClause(trimmed);
    }

    private static String firstClause(String text) {
        int stop = indexOfAny(text, ".", "?", "!", " — ", " - ", ";");
        String clause = stop > 0 ? text.substring(0, stop) : text;
        if (clause.length() > 48) {
            clause = clause.substring(0, 48).trim();
        }
        return clause.isBlank() ? "Custom role" : clause;
    }

    private static int indexOfAny(String text, String... needles) {
        int min = -1;
        for (String needle : needles) {
            int idx = text.indexOf(needle);
            if (idx >= 0 && (min < 0 || idx < min)) {
                min = idx;
            }
        }
        return min;
    }

    private static Optional<Role> findBestNameMatch(String prompt, List<Role> roles) {
        String lower = prompt.toLowerCase(Locale.ROOT);
        return roles.stream()
            .max(Comparator.comparingInt(role -> nameMatchScore(lower, role.getName().toLowerCase(Locale.ROOT))))
            .filter(role -> nameMatchScore(lower, role.getName().toLowerCase(Locale.ROOT)) >= 55);
    }

    private static int nameMatchScore(String promptLower, String roleNameLower) {
        if (promptLower.contains(roleNameLower)) {
            return 90;
        }
        for (String token : roleNameLower.split("\\s+")) {
            if (token.length() > 3 && promptLower.contains(token)) {
                return 70;
            }
        }
        return 0;
    }

    private static String resolveMatchType(
        String prompt,
        RoleDraftSuggestion suggested,
        List<Role> existingRoles,
        Optional<Role> baseRole
    ) {
        if (baseRole.isPresent()) {
            return "VARIANT_OF_EXISTING";
        }
        boolean duplicate = existingRoles.stream().anyMatch(role ->
            role.getName().equalsIgnoreCase(suggested.name())
                && samePermissions(role, suggested.permissionCodes())
        );
        if (duplicate) {
            return "EXACT_DUPLICATE";
        }
        boolean nearName = existingRoles.stream().anyMatch(role ->
            role.getName().equalsIgnoreCase(suggested.name())
        );
        if (nearName) {
            return "VARIANT_OF_EXISTING";
        }
        if (existingRoles.stream().anyMatch(role -> nameMatchScore(
            prompt.toLowerCase(Locale.ROOT),
            role.getName().toLowerCase(Locale.ROOT)
        ) >= 55)) {
            return "NEAREST_EXISTING";
        }
        return "NEW_ROLE";
    }

    private static boolean samePermissions(Role role, List<String> codes) {
        Set<String> existing = role.getPermissions().stream().map(Permission::getCode).collect(Collectors.toSet());
        return existing.equals(new LinkedHashSet<>(codes));
    }

    private static List<SimilarRoleHint> rankSimilarRoles(
        List<String> suggestedCodes,
        List<Role> existingRoles,
        Optional<Role> exclude
    ) {
        Set<String> suggested = new LinkedHashSet<>(suggestedCodes);
        UUID excludeId = exclude.map(Role::getId).orElse(null);

        return existingRoles.stream()
            .filter(role -> excludeId == null || !role.getId().equals(excludeId))
            .map(role -> {
                Set<String> roleCodes = role.getPermissions().stream().map(Permission::getCode).collect(Collectors.toSet());
                int overlap = (int) roleCodes.stream().filter(suggested::contains).count();
                int union = roleCodes.size() + suggested.size() - overlap;
                int percent = union == 0 ? 0 : Math.round(100f * overlap / union);
                String reason = overlap > 0
                    ? overlap + " shared permissions"
                    : "Similar job function";
                return new SimilarRoleHint(
                    role.getId(),
                    role.getName(),
                    role.getEmoji(),
                    percent,
                    reason,
                    roleCodes.stream().sorted().toList()
                );
            })
            .sorted(Comparator.comparingInt(SimilarRoleHint::matchPercent).reversed())
            .limit(4)
            .toList();
    }

    private static List<String> detectUnsupported(String prompt, Set<String> catalogCodes) {
        List<String> notes = new ArrayList<>();
        String lower = prompt.toLowerCase(Locale.ROOT);
        if (containsAny(lower, "owner", "full access", "everything", "all permissions", "super admin")) {
            notes.add("Full owner access cannot be created via assistant — use the built-in Owner role.");
        }
        if (containsAny(lower, "other tenant", "all companies", "cross-tenant")) {
            notes.add("Cross-tenant access is not supported.");
        }
        if (catalogCodes.isEmpty()) {
            notes.add("Permission catalog is empty.");
        }
        return notes;
    }

    private static String buildSummary(
        String matchType,
        RoleDraftSuggestion suggested,
        Optional<Role> base,
        int customCount
    ) {
        int platformCount = suggested.permissionCodes().size();
        String customNote = customCount > 0 ? " and " + customCount + " tenant-defined permission(s)" : "";
        return switch (matchType) {
            case "EXACT_DUPLICATE" -> "A role named \"" + suggested.name() + "\" with the same access already exists.";
            case "VARIANT_OF_EXISTING" -> base
                .map(r -> "Custom variant based on \"" + r.getName() + "\" — " + platformCount + " system" + customNote + ".")
                .orElse("Similar to an existing role — review permissions before saving.");
            case "NEAREST_EXISTING" -> "Closest match is an existing role; consider duplicating and tweaking it.";
            default -> "New role \"" + suggested.name() + "\" with " + platformCount + " system" + customNote + ".";
        };
    }

    private static String buildReasoning(
        String matchType,
        String prompt,
        RoleDraftSuggestion suggested,
        Optional<Role> base,
        List<String> unsupported,
        boolean aiEnhanced,
        List<CustomPermissionProposal> customProposals
    ) {
        StringBuilder sb = new StringBuilder();
        if (aiEnhanced) {
            sb.append("AI refined your description. ");
        } else {
            sb.append("Matched keywords in your description. ");
        }
        if (base.isPresent()) {
            sb.append("Started from \"").append(base.get().getName()).append("\" and applied your constraints. ");
        }
        if (!customProposals.isEmpty()) {
            sb.append("Created tenant permissions exactly as requested: ");
            sb.append(customProposals.stream().map(CustomPermissionProposal::label).collect(Collectors.joining(", ")));
            sb.append(". Link them to system permissions in the role editor if you need API enforcement. ");
        }
        sb.append("System permissions: ").append(suggested.permissionCodes().size()).append(". ");
        sb.append("Request: ").append(prompt.length() > 80 ? prompt.substring(0, 77) + "…" : prompt);
        if (!unsupported.isEmpty()) {
            sb.append(" Note: ").append(String.join(" ", unsupported));
        }
        return sb.toString().trim();
    }

    private static String pickEmoji(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        if (containsAny(lower, "finance", "account")) return "💰";
        if (containsAny(lower, "stock", "warehouse", "inventory")) return "📦";
        if (containsAny(lower, "store", "shop", "sales")) return "🏪";
        if (containsAny(lower, "hr", "people", "staff")) return "👥";
        if (containsAny(lower, "market")) return "📢";
        if (containsAny(lower, "cashier", "pos", "till")) return "🧾";
        return "🎯";
    }

    private static boolean containsAny(String haystack, String... needles) {
        for (String needle : needles) {
            if (haystack.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
