package com.smartaccounting.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.dto.rbac.RoleProfileConfig;
import com.smartaccounting.entity.Role;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class RoleProfileService {
    private static final Set<String> VALID_DASHBOARDS = Set.of(
        "CEO", "CFO", "SALES", "OPERATIONS", "HR", "MARKETING", "ACCOUNTING"
    );

    private static final Set<String> VALID_NAV_ITEMS = Set.of(
        "invoice",
        "purchase-order",
        "sales-order",
        "pos",
        "pos-history",
        "pos-returns",
        "till",
        "retail",
        "fx-rates",
        "credit-ledger",
        "supplier-bills",
        "payment-runs",
        "fixed-assets",
        "month-end-close",
        "documents",
        "attendance",
        "marketing-campaigns",
        "promotions",
        "workflow-rules",
        "bank-reconciliation",
        "hr-payroll",
        "ebm-compliance",
        "sms-deliveries",
        "admin-roles",
        "users-tenants"
    );

    private static final Set<String> VALID_LAYOUTS = Set.of(
        "executive", "finance", "operations", "people", "growth", "workspace"
    );

    private static final Set<String> VALID_WORKFLOW_IDS = Set.of(
        "workflow-rules",
        "tenant-oversight",
        "finance-close",
        "bank-reconciliation",
        "till-close",
        "sale-returns",
        "stock-adjustments",
        "purchase-orders",
        "shift-approvals",
        "payroll-review",
        "campaign-approvals",
        "role-approvals",
        "ebm-audit",
        "copilot-agent"
    );

    private static final Set<String> VALID_RECOMMENDATION_SOURCES = Set.of(
        "STATIC_TEMPLATE",
        "AI_ASSISTED",
        "ADMIN_AUTHORED",
        "LEGACY_PRESET",
        "PERMISSION_DERIVED"
    );

    private static final Map<String, CapabilityBundle> CAPABILITY_BUNDLES = Map.ofEntries(
        Map.entry(
            "executive.command",
            new CapabilityBundle(
                "executive.command",
                Set.of("ANALYTICS_ALL", "TENANT_CONFIG", "ROLE_MANAGE", "USER_MANAGE", "REPORTS_EXPORT"),
                List.of("CEO", "CFO", "SALES", "OPERATIONS", "HR", "MARKETING", "ACCOUNTING"),
                List.of("pos-history", "bank-reconciliation", "marketing-campaigns", "promotions", "workflow-rules", "users-tenants", "admin-roles", "sms-deliveries", "documents"),
                List.of("tenant-oversight", "workflow-rules"),
                "/dashboard/ceo",
                "executive",
                Map.of("showExecutiveSummary", true)
            )
        ),
        Map.entry(
            "finance.control",
            new CapabilityBundle(
                "finance.control",
                Set.of("FINANCE_READ", "FINANCE_WRITE", "FINANCE_CLOSE", "REPORTS_EXPORT", "ASSETS_MANAGE"),
                List.of("CFO", "ACCOUNTING"),
                List.of("invoice", "fx-rates", "credit-ledger", "supplier-bills", "payment-runs", "fixed-assets", "month-end-close", "bank-reconciliation", "documents"),
                List.of("finance-close", "bank-reconciliation"),
                "/dashboard/cfo",
                "finance",
                Map.of("showCloseChecklist", true)
            )
        ),
        Map.entry(
            "sales.pos",
            new CapabilityBundle(
                "sales.pos",
                Set.of("POS_ACCESS", "POS_TILL_MANAGE", "POS_RETURNS", "POS_DISCOUNT", "EBM_SUBMIT", "ANALYTICS_OWN"),
                List.of("SALES"),
                List.of("sales-order", "pos", "pos-history", "pos-returns", "till"),
                List.of("till-close", "sale-returns"),
                "/dashboard/sales",
                "operations",
                Map.of("showQuickSaleShortcuts", true)
            )
        ),
        Map.entry(
            "inventory.operations",
            new CapabilityBundle(
                "inventory.operations",
                Set.of("INVENTORY_READ", "INVENTORY_WRITE", "INVENTORY_SHRINKAGE", "PROCUREMENT_READ", "PROCUREMENT_WRITE"),
                List.of("OPERATIONS"),
                List.of("purchase-order", "retail"),
                List.of("stock-adjustments", "purchase-orders"),
                "/dashboard/operations",
                "operations",
                Map.of("showStockAging", true)
            )
        ),
        Map.entry(
            "people.operations",
            new CapabilityBundle(
                "people.operations",
                Set.of("HR_READ", "HR_WRITE", "PAYROLL_READ", "PAYROLL_WRITE", "STAFF_INVITE"),
                List.of("HR"),
                List.of("attendance", "hr-payroll"),
                List.of("shift-approvals", "payroll-review"),
                "/dashboard/hr",
                "people",
                Map.of("showPeoplePanel", true)
            )
        ),
        Map.entry(
            "marketing.growth",
            new CapabilityBundle(
                "marketing.growth",
                Set.of("ANALYTICS_ALL", "AI_COPILOT"),
                List.of("MARKETING"),
                List.of("marketing-campaigns", "promotions"),
                List.of("campaign-approvals"),
                "/dashboard/marketing",
                "growth",
                Map.of("showCampaignInsights", true)
            )
        ),
        Map.entry(
            "admin.security",
            new CapabilityBundle(
                "admin.security",
                Set.of("ROLE_MANAGE", "USER_MANAGE", "TENANT_CONFIG"),
                List.of("CEO"),
                List.of("admin-roles", "users-tenants", "workflow-rules"),
                List.of("role-approvals", "workflow-rules"),
                "/admin/users-tenants",
                "workspace",
                Map.of("showAdminShortcuts", true)
            )
        ),
        Map.entry(
            "compliance.audit",
            new CapabilityBundle(
                "compliance.audit",
                Set.of("EBM_AUDIT", "REPORTS_EXPORT"),
                List.of("ACCOUNTING"),
                List.of("ebm-compliance", "sms-deliveries", "documents"),
                List.of("ebm-audit"),
                "/dashboard/accounting",
                "finance",
                Map.of("showAuditPanel", true)
            )
        ),
        Map.entry(
            "copilot.assistant",
            new CapabilityBundle(
                "copilot.assistant",
                Set.of("AI_COPILOT"),
                List.of(),
                List.of(),
                List.of("copilot-agent"),
                null,
                "workspace",
                Map.of("showCopilot", true)
            )
        )
    );

    private final ObjectMapper objectMapper;
    private final DashboardRoleResolver dashboardRoleResolver;

    public RoleProfileService(ObjectMapper objectMapper, DashboardRoleResolver dashboardRoleResolver) {
        this.objectMapper = objectMapper;
        this.dashboardRoleResolver = dashboardRoleResolver;
    }

    public RoleProfileConfig deserialize(String json) {
        if (json == null || json.isBlank()) {
            return RoleProfileConfig.empty();
        }
        try {
            RoleProfileConfig parsed = objectMapper.readValue(json, RoleProfileConfig.class);
            return parsed == null ? RoleProfileConfig.empty() : parsed;
        } catch (Exception ignored) {
            return RoleProfileConfig.empty();
        }
    }

    public String serialize(RoleProfileConfig profile) {
        try {
            return objectMapper.writeValueAsString(profile == null ? RoleProfileConfig.empty() : profile);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize role profile", ex);
        }
    }

    public ResolvedRoleProfile resolveForPersist(
        RoleProfileConfig requested,
        Collection<String> requestedPermissionCodes,
        String roleName,
        String defaultRecommendationSource
    ) {
        Set<String> permissionCodes = normalizeCodes(requestedPermissionCodes);
        Set<String> inferredBundles = inferBundles(roleName, permissionCodes);
        Set<String> requestedBundles = requested == null
            ? Set.of()
            : new LinkedHashSet<>(requested.capabilityBundleIds());
        Set<String> capabilityBundleIds = new LinkedHashSet<>(requestedBundles);
        capabilityBundleIds.addAll(inferredBundles);

        for (String bundleId : capabilityBundleIds) {
            CapabilityBundle bundle = CAPABILITY_BUNDLES.get(bundleId);
            if (bundle == null) {
                throw new IllegalArgumentException("Unknown capability bundle: " + bundleId);
            }
            permissionCodes.addAll(bundle.permissionCodes());
        }

        RoleProfileConfig normalized = normalizeProfile(
            requested == null ? RoleProfileConfig.empty() : requested,
            capabilityBundleIds,
            permissionCodes,
            defaultRecommendationSource
        );
        return new ResolvedRoleProfile(normalized, List.copyOf(permissionCodes));
    }

    public RoleProfileConfig forStoredRole(Role role) {
        Set<String> codes = role.getPermissions().stream()
            .map(permission -> permission.getCode())
            .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        return normalizeProfile(
            deserialize(role.getRoleProfileJson()),
            inferBundles(role.getName(), codes),
            codes,
            "ADMIN_AUTHORED"
        );
    }

    public RoleProfileConfig resolveEffectiveProfile(
        List<Role> assignedRoles,
        Collection<String> effectivePermissions,
        String legacyRole,
        String dashboardRole
    ) {
        Set<String> normalizedPermissions = normalizeCodes(effectivePermissions);
        List<RoleProfileConfig> profiles = assignedRoles.stream()
            .map(this::forStoredRole)
            .filter(profile -> !profile.equals(RoleProfileConfig.empty()))
            .toList();

        if (profiles.isEmpty()) {
            return normalizeProfile(
                legacyPreset(legacyRole, dashboardRole, normalizedPermissions),
                inferBundles(legacyRole, normalizedPermissions),
                normalizedPermissions,
                "LEGACY_PRESET"
            );
        }

        return mergeProfiles(profiles, normalizedPermissions, dashboardRole);
    }

    private RoleProfileConfig mergeProfiles(
        List<RoleProfileConfig> profiles,
        Set<String> permissionCodes,
        String dashboardRole
    ) {
        LinkedHashSet<String> bundleIds = new LinkedHashSet<>();
        LinkedHashSet<String> dashboards = new LinkedHashSet<>();
        LinkedHashSet<String> navItems = new LinkedHashSet<>();
        LinkedHashSet<String> searchScopes = new LinkedHashSet<>();
        LinkedHashSet<String> workflowTemplateIds = new LinkedHashSet<>();
        LinkedHashMap<String, Boolean> uiFlags = new LinkedHashMap<>();
        String landingRoute = null;
        String layoutVariant = null;
        String source = null;

        for (RoleProfileConfig profile : profiles) {
            bundleIds.addAll(profile.capabilityBundleIds());
            dashboards.addAll(profile.dashboardIds());
            navItems.addAll(profile.navItemIds());
            searchScopes.addAll(profile.searchScopes());
            workflowTemplateIds.addAll(profile.workflowTemplateIds());
            uiFlags.putAll(profile.uiFlags());
            if (landingRoute == null && profile.landingRoute() != null) {
                landingRoute = profile.landingRoute();
            }
            if (layoutVariant == null && profile.layoutVariant() != null) {
                layoutVariant = profile.layoutVariant();
            }
            if (source == null && profile.recommendationSource() != null) {
                source = profile.recommendationSource();
            }
        }

        if (dashboards.isEmpty() && dashboardRole != null && !dashboardRole.isBlank()) {
            dashboards.add(dashboardRole.trim().toUpperCase(Locale.ROOT));
        }

        return normalizeProfile(
            new RoleProfileConfig(
                List.copyOf(bundleIds),
                List.copyOf(dashboards),
                landingRoute,
                List.copyOf(navItems),
                List.copyOf(searchScopes),
                List.copyOf(workflowTemplateIds),
                layoutVariant,
                uiFlags,
                source
            ),
            bundleIds,
            permissionCodes,
            source == null ? "ADMIN_AUTHORED" : source
        );
    }

    private RoleProfileConfig legacyPreset(String legacyRole, String dashboardRole, Set<String> permissions) {
        LinkedHashSet<String> bundleIds = inferBundles(legacyRole, permissions);
        LinkedHashSet<String> dashboards = defaultDashboards(bundleIds, permissions);
        if (dashboardRole != null && !dashboardRole.isBlank()) {
            dashboards.add(dashboardRole.trim().toUpperCase(Locale.ROOT));
        }
        return new RoleProfileConfig(
            List.copyOf(bundleIds),
            List.copyOf(dashboards),
            defaultLandingRoute(dashboards, permissions),
            List.of(),
            List.of(),
            List.of(),
            null,
            Map.of(),
            "LEGACY_PRESET"
        );
    }

    private RoleProfileConfig normalizeProfile(
        RoleProfileConfig requested,
        Collection<String> capabilityBundleIds,
        Set<String> permissionCodes,
        String defaultRecommendationSource
    ) {
        LinkedHashSet<String> normalizedBundles = new LinkedHashSet<>();
        for (String bundleId : capabilityBundleIds) {
            if (!CAPABILITY_BUNDLES.containsKey(bundleId)) {
                throw new IllegalArgumentException("Unknown capability bundle: " + bundleId);
            }
            normalizedBundles.add(bundleId);
        }

        LinkedHashSet<String> dashboards = requested.dashboardIds().isEmpty()
            ? defaultDashboards(normalizedBundles, permissionCodes)
            : filterValues(requested.dashboardIds(), VALID_DASHBOARDS);
        if (dashboards.isEmpty()) {
            String primaryDashboard = dashboardRoleResolver.resolvePrimaryDashboardRole(permissionCodes, null);
            if (primaryDashboard != null && !primaryDashboard.isBlank()) {
                dashboards.add(primaryDashboard);
            }
        }

        LinkedHashSet<String> navItemIds = requested.navItemIds().isEmpty()
            ? defaultNavItems(normalizedBundles, permissionCodes)
            : filterValues(requested.navItemIds(), VALID_NAV_ITEMS);

        LinkedHashSet<String> workflowTemplateIds = requested.workflowTemplateIds().isEmpty()
            ? defaultWorkflowTemplates(normalizedBundles)
            : filterValues(requested.workflowTemplateIds(), VALID_WORKFLOW_IDS);

        LinkedHashSet<String> searchScopes = new LinkedHashSet<>();
        if (requested.searchScopes().isEmpty()) {
            searchScopes.addAll(navItemIds);
            dashboards.forEach(dashboard -> searchScopes.add("dashboard:" + dashboard));
        } else {
            for (String scope : requested.searchScopes()) {
                if (scope.startsWith("dashboard:")) {
                    String dashboard = scope.substring("dashboard:".length()).trim().toUpperCase(Locale.ROOT);
                    if (VALID_DASHBOARDS.contains(dashboard)) {
                        searchScopes.add("dashboard:" + dashboard);
                    }
                } else if (VALID_NAV_ITEMS.contains(scope)) {
                    searchScopes.add(scope);
                }
            }
        }

        Map<String, Boolean> uiFlags = new LinkedHashMap<>(defaultUiFlags(normalizedBundles));
        uiFlags.putAll(requested.uiFlags());

        String layoutVariant = requested.layoutVariant();
        if (layoutVariant == null || !VALID_LAYOUTS.contains(layoutVariant)) {
            layoutVariant = defaultLayoutVariant(normalizedBundles);
        }

        String recommendationSource = requested.recommendationSource();
        if (recommendationSource == null || !VALID_RECOMMENDATION_SOURCES.contains(recommendationSource)) {
            recommendationSource = VALID_RECOMMENDATION_SOURCES.contains(defaultRecommendationSource)
                ? defaultRecommendationSource
                : "PERMISSION_DERIVED";
        }

        String landingRoute = requested.landingRoute();
        if (landingRoute == null || landingRoute.isBlank()) {
            landingRoute = defaultLandingRoute(dashboards, permissionCodes);
        }

        return new RoleProfileConfig(
            List.copyOf(normalizedBundles),
            List.copyOf(dashboards),
            landingRoute,
            List.copyOf(navItemIds),
            List.copyOf(searchScopes),
            List.copyOf(workflowTemplateIds),
            layoutVariant,
            uiFlags,
            recommendationSource
        );
    }

    private LinkedHashSet<String> inferBundles(String roleName, Set<String> permissionCodes) {
        String normalizedName = roleName == null ? "" : roleName.trim().toLowerCase(Locale.ROOT);
        LinkedHashSet<String> bundles = new LinkedHashSet<>();
        if (hasAny(permissionCodes, "ANALYTICS_ALL", "TENANT_CONFIG", "ROLE_MANAGE", "USER_MANAGE")
            || containsAny(normalizedName, "owner", "ceo", "director", "executive")) {
            bundles.add("executive.command");
        }
        if (hasAny(permissionCodes, "FINANCE_READ", "FINANCE_WRITE", "FINANCE_CLOSE", "ASSETS_MANAGE")
            || containsAny(normalizedName, "finance", "account", "controller", "treasury")) {
            bundles.add("finance.control");
        }
        if (hasAny(permissionCodes, "POS_ACCESS", "POS_TILL_MANAGE", "POS_RETURNS", "POS_DISCOUNT")
            || containsAny(normalizedName, "cashier", "sales", "store", "till")) {
            bundles.add("sales.pos");
        }
        if (hasAny(permissionCodes, "INVENTORY_READ", "INVENTORY_WRITE", "INVENTORY_SHRINKAGE", "PROCUREMENT_READ", "PROCUREMENT_WRITE")
            || containsAny(normalizedName, "inventory", "stock", "procurement", "operations")) {
            bundles.add("inventory.operations");
        }
        if (hasAny(permissionCodes, "HR_READ", "HR_WRITE", "PAYROLL_READ", "PAYROLL_WRITE", "STAFF_INVITE")
            || containsAny(normalizedName, "hr", "human", "people", "payroll")) {
            bundles.add("people.operations");
        }
        if ((permissionCodes.contains("ANALYTICS_ALL") && permissionCodes.contains("AI_COPILOT"))
            || containsAny(normalizedName, "marketing", "campaign", "brand", "growth")) {
            bundles.add("marketing.growth");
        }
        if (hasAny(permissionCodes, "ROLE_MANAGE", "USER_MANAGE", "TENANT_CONFIG")
            || containsAny(normalizedName, "admin", "security")) {
            bundles.add("admin.security");
        }
        if (hasAny(permissionCodes, "EBM_AUDIT", "REPORTS_EXPORT")
            || containsAny(normalizedName, "audit", "compliance")) {
            bundles.add("compliance.audit");
        }
        if (permissionCodes.contains("AI_COPILOT") || containsAny(normalizedName, "copilot", "assistant", "analyst")) {
            bundles.add("copilot.assistant");
        }
        return bundles;
    }

    private LinkedHashSet<String> defaultDashboards(Collection<String> capabilityBundleIds, Set<String> permissionCodes) {
        LinkedHashSet<String> dashboards = new LinkedHashSet<>();
        for (String bundleId : capabilityBundleIds) {
            dashboards.addAll(CAPABILITY_BUNDLES.get(bundleId).dashboardIds());
        }
        if (dashboards.isEmpty()) {
            for (String candidate : VALID_DASHBOARDS) {
                if (dashboardRoleResolver.canViewDashboard(permissionCodes, candidate)) {
                    dashboards.add(candidate);
                }
            }
        }
        return dashboards;
    }

    private LinkedHashSet<String> defaultNavItems(Collection<String> capabilityBundleIds, Set<String> permissionCodes) {
        LinkedHashSet<String> navItems = new LinkedHashSet<>();
        for (String bundleId : capabilityBundleIds) {
            navItems.addAll(CAPABILITY_BUNDLES.get(bundleId).navItemIds());
        }
        if (permissionCodes.contains("FINANCE_WRITE")) {
            navItems.add("invoice");
        }
        if (permissionCodes.contains("PROCUREMENT_READ")) {
            navItems.add("purchase-order");
        }
        if (permissionCodes.contains("POS_ACCESS")) {
            navItems.addAll(List.of("sales-order", "pos", "till"));
        }
        if (permissionCodes.contains("ANALYTICS_OWN") || permissionCodes.contains("ANALYTICS_ALL")) {
            navItems.add("pos-history");
        }
        if (permissionCodes.contains("POS_RETURNS")) {
            navItems.add("pos-returns");
        }
        if (permissionCodes.contains("INVENTORY_READ")) {
            navItems.add("retail");
        }
        if (permissionCodes.contains("FINANCE_READ")) {
            navItems.addAll(List.of("fx-rates", "credit-ledger", "supplier-bills", "payment-runs", "fixed-assets", "month-end-close", "bank-reconciliation", "documents", "sms-deliveries"));
        }
        if (permissionCodes.contains("HR_READ")) {
            navItems.addAll(List.of("attendance", "hr-payroll"));
        }
        if (permissionCodes.contains("ANALYTICS_ALL")) {
            navItems.addAll(List.of("marketing-campaigns", "promotions"));
        }
        if (permissionCodes.contains("ROLE_MANAGE")) {
            navItems.addAll(List.of("workflow-rules", "admin-roles"));
        }
        if (permissionCodes.contains("USER_MANAGE") || permissionCodes.contains("TENANT_CONFIG")) {
            navItems.add("users-tenants");
        }
        if (permissionCodes.contains("EBM_AUDIT")) {
            navItems.add("ebm-compliance");
        }
        return navItems.stream()
            .filter(VALID_NAV_ITEMS::contains)
            .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private LinkedHashSet<String> defaultWorkflowTemplates(Collection<String> capabilityBundleIds) {
        LinkedHashSet<String> workflowIds = new LinkedHashSet<>();
        for (String bundleId : capabilityBundleIds) {
            workflowIds.addAll(CAPABILITY_BUNDLES.get(bundleId).workflowTemplateIds());
        }
        return workflowIds;
    }

    private Map<String, Boolean> defaultUiFlags(Collection<String> capabilityBundleIds) {
        LinkedHashMap<String, Boolean> flags = new LinkedHashMap<>();
        for (String bundleId : capabilityBundleIds) {
            flags.putAll(CAPABILITY_BUNDLES.get(bundleId).uiFlags());
        }
        return flags;
    }

    private String defaultLayoutVariant(Collection<String> capabilityBundleIds) {
        for (String bundleId : capabilityBundleIds) {
            String layoutVariant = CAPABILITY_BUNDLES.get(bundleId).layoutVariant();
            if (layoutVariant != null && VALID_LAYOUTS.contains(layoutVariant)) {
                return layoutVariant;
            }
        }
        return "workspace";
    }

    private String defaultLandingRoute(Set<String> dashboards, Set<String> permissionCodes) {
        if (dashboards.contains("CEO")) {
            return "/dashboard/ceo";
        }
        if (dashboards.contains("CFO")) {
            return "/dashboard/cfo";
        }
        if (dashboards.contains("ACCOUNTING")) {
            return "/dashboard/accounting";
        }
        if (dashboards.contains("SALES")) {
            return "/dashboard/sales";
        }
        if (dashboards.contains("OPERATIONS")) {
            return "/dashboard/operations";
        }
        if (dashboards.contains("HR")) {
            return "/dashboard/hr";
        }
        if (dashboards.contains("MARKETING")) {
            return "/dashboard/marketing";
        }
        if (permissionCodes.contains("POS_ACCESS")) {
            return "/pos";
        }
        if (permissionCodes.contains("FINANCE_READ")) {
            return "/finance/fx-rates";
        }
        if (permissionCodes.contains("INVENTORY_READ")) {
            return "/retail";
        }
        return "/settings";
    }

    private static boolean hasAny(Set<String> permissionCodes, String... values) {
        for (String value : values) {
            if (permissionCodes.contains(value)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsAny(String value, String... needles) {
        for (String needle : needles) {
            if (value.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private static Set<String> normalizeCodes(Collection<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return new LinkedHashSet<>();
        }
        return codes.stream()
            .filter(code -> code != null && !code.isBlank())
            .map(code -> code.trim().toUpperCase(Locale.ROOT))
            .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private static LinkedHashSet<String> filterValues(Collection<String> values, Set<String> allowed) {
        LinkedHashSet<String> filtered = new LinkedHashSet<>();
        for (String value : values) {
            if (value != null && allowed.contains(value)) {
                filtered.add(value);
            }
        }
        return filtered;
    }

    private record CapabilityBundle(
        String id,
        Set<String> permissionCodes,
        List<String> dashboardIds,
        List<String> navItemIds,
        List<String> workflowTemplateIds,
        String landingRoute,
        String layoutVariant,
        Map<String, Boolean> uiFlags
    ) {
    }

    public record ResolvedRoleProfile(RoleProfileConfig profile, List<String> permissionCodes) {
    }
}
