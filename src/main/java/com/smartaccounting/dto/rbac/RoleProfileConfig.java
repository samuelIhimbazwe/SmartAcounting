package com.smartaccounting.dto.rbac;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RoleProfileConfig(
    List<String> capabilityBundleIds,
    List<String> dashboardIds,
    String landingRoute,
    List<String> navItemIds,
    List<String> searchScopes,
    List<String> workflowTemplateIds,
    String layoutVariant,
    Map<String, Boolean> uiFlags,
    String recommendationSource
) {
    public RoleProfileConfig {
        capabilityBundleIds = normalizeList(capabilityBundleIds);
        dashboardIds = normalizeList(dashboardIds);
        navItemIds = normalizeList(navItemIds);
        searchScopes = normalizeList(searchScopes);
        workflowTemplateIds = normalizeList(workflowTemplateIds);
        uiFlags = normalizeFlags(uiFlags);
        landingRoute = normalizeNullable(landingRoute);
        layoutVariant = normalizeNullable(layoutVariant);
        recommendationSource = normalizeNullable(recommendationSource);
    }

    public static RoleProfileConfig empty() {
        return new RoleProfileConfig(List.of(), List.of(), null, List.of(), List.of(), List.of(), null, Map.of(), null);
    }

    private static List<String> normalizeList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(String::trim)
            .collect(java.util.stream.Collectors.collectingAndThen(
                java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                List::copyOf
            ));
    }

    private static Map<String, Boolean> normalizeFlags(Map<String, Boolean> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        Map<String, Boolean> normalized = new LinkedHashMap<>();
        values.forEach((key, value) -> {
            String normalizedKey = normalizeNullable(key);
            if (normalizedKey != null && value != null) {
                normalized.put(normalizedKey, value);
            }
        });
        return Map.copyOf(normalized);
    }

    private static String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
