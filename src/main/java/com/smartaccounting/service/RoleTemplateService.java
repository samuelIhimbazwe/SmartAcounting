package com.smartaccounting.service;

import com.smartaccounting.entity.BusinessSize;
import com.smartaccounting.entity.BusinessType;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.repository.PermissionRepository;
import com.smartaccounting.service.rbac.RoleTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
public class RoleTemplateService {
    private static final List<String> POS_ALWAYS = List.of(
        "POS_ACCESS",
        "POS_TILL_MANAGE",
        "POS_RETURNS",
        "POS_DISCOUNT",
        "EBM_SUBMIT"
    );

    private static final List<String> MANAGER_ALWAYS = List.of(
        "POS_ACCESS",
        "POS_TILL_MANAGE",
        "POS_RETURNS",
        "POS_DISCOUNT",
        "EBM_SUBMIT",
        "EBM_AUDIT",
        "INVENTORY_READ",
        "INVENTORY_WRITE",
        "PROCUREMENT_READ",
        "FINANCE_READ",
        "ANALYTICS_OWN",
        "REPORTS_EXPORT"
    );

    private static final List<String> MANAGER_OPTIONAL = List.of(
        "EBM_CONFIG",
        "INVENTORY_SHRINKAGE",
        "PROCUREMENT_WRITE",
        "FINANCE_WRITE",
        "PAYROLL_READ",
        "HR_READ",
        "AI_COPILOT"
    );

    private static final List<String> RETAIL_MEDIUM_MANAGER_ALWAYS = List.of(
        "POS_ACCESS",
        "EBM_SUBMIT",
        "FINANCE_READ",
        "HR_READ",
        "STAFF_INVITE"
    );

    private static final List<String> RETAIL_MEDIUM_MANAGER_OPTIONAL = List.of(
        "INVENTORY_READ",
        "PROCUREMENT_READ",
        "ANALYTICS_OWN",
        "AI_COPILOT"
    );

    private static final Set<BusinessType> LARGE_MAPPED_TYPES = EnumSet.of(BusinessType.RETAIL);

    private final PermissionRepository permissionRepository;
    private final RoleProfileService roleProfileService;

    public RoleTemplateService(PermissionRepository permissionRepository, RoleProfileService roleProfileService) {
        this.permissionRepository = permissionRepository;
        this.roleProfileService = roleProfileService;
    }

    public List<RoleTemplate> getRecommendation(BusinessSize size, BusinessType type) {
        if (type == BusinessType.OTHER) {
            return List.of();
        }

        BusinessSize effectiveSize = resolveEffectiveSize(size, type);

        return switch (type) {
            case RETAIL -> retailTemplates(effectiveSize);
            case FOOD -> foodTemplates(effectiveSize);
            default -> List.of();
        };
    }

    private BusinessSize resolveEffectiveSize(BusinessSize size, BusinessType type) {
        if (size == BusinessSize.LARGE && !LARGE_MAPPED_TYPES.contains(type)) {
            return BusinessSize.MEDIUM;
        }
        return size;
    }

    private List<RoleTemplate> retailTemplates(BusinessSize size) {
        return switch (size) {
            case SOLO -> List.of(ownerTemplate());
            case SMALL -> retailSmall();
            case MEDIUM, LARGE -> retailMedium();
            default -> List.of();
        };
    }

    private List<RoleTemplate> foodTemplates(BusinessSize size) {
        return switch (size) {
            case SOLO -> List.of(ownerTemplate());
            case SMALL -> foodSmall();
            case MEDIUM, LARGE -> foodMedium();
            default -> List.of();
        };
    }

    private List<RoleTemplate> retailSmall() {
        return List.of(
            ownerTemplate(),
            new RoleTemplate(
                "Store Manager",
                "Runs daily store operations, stock, and team",
                "🏬",
                "#0ea5e9",
                MANAGER_ALWAYS,
                MANAGER_OPTIONAL,
                false,
                roleProfileForTemplate("Store Manager", MANAGER_ALWAYS, MANAGER_OPTIONAL, "STATIC_TEMPLATE")
            ),
            new RoleTemplate(
                "Cashier",
                "Processes sales at the till",
                "🧾",
                "#22c55e",
                POS_ALWAYS,
                List.of("POS_DISCOUNT"),
                false,
                roleProfileForTemplate("Cashier", POS_ALWAYS, List.of("POS_DISCOUNT"), "STATIC_TEMPLATE")
            )
        );
    }

    private List<RoleTemplate> retailMedium() {
        return List.of(
            ownerTemplate(),
            new RoleTemplate(
                "Store Manager",
                "Oversees store operations, staff, and reporting",
                "🏬",
                "#0ea5e9",
                RETAIL_MEDIUM_MANAGER_ALWAYS,
                RETAIL_MEDIUM_MANAGER_OPTIONAL,
                false,
                roleProfileForTemplate("Store Manager", RETAIL_MEDIUM_MANAGER_ALWAYS, RETAIL_MEDIUM_MANAGER_OPTIONAL, "STATIC_TEMPLATE")
            ),
            new RoleTemplate(
                "Cashier",
                "Processes sales at the till",
                "🧾",
                "#22c55e",
                POS_ALWAYS,
                List.of(),
                false,
                roleProfileForTemplate("Cashier", POS_ALWAYS, List.of(), "STATIC_TEMPLATE")
            ),
            new RoleTemplate(
                "Stock Manager",
                "Manages inventory and replenishment",
                "📦",
                "#f59e0b",
                List.of("INVENTORY_READ", "INVENTORY_WRITE", "PROCUREMENT_READ"),
                List.of("INVENTORY_SHRINKAGE", "PROCUREMENT_WRITE"),
                false,
                roleProfileForTemplate("Stock Manager", List.of("INVENTORY_READ", "INVENTORY_WRITE", "PROCUREMENT_READ"), List.of("INVENTORY_SHRINKAGE", "PROCUREMENT_WRITE"), "STATIC_TEMPLATE")
            )
        );
    }

    private List<RoleTemplate> foodSmall() {
        return List.of(
            ownerTemplate(),
            new RoleTemplate(
                "Shift Lead",
                "Runs a single outlet shift",
                "👨‍🍳",
                "#f97316",
                List.of("POS_ACCESS", "EBM_SUBMIT", "INVENTORY_READ"),
                List.of("FINANCE_READ"),
                false,
                roleProfileForTemplate("Shift Lead", List.of("POS_ACCESS", "EBM_SUBMIT", "INVENTORY_READ"), List.of("FINANCE_READ"), "STATIC_TEMPLATE")
            )
        );
    }

    private List<RoleTemplate> foodMedium() {
        return List.of(
            ownerTemplate(),
            new RoleTemplate(
                "Restaurant Manager",
                "Oversees kitchen, front-of-house, and daily operations",
                "🍽️",
                "#ea580c",
                List.of(
                    "POS_ACCESS",
                    "EBM_SUBMIT",
                    "INVENTORY_READ",
                    "INVENTORY_WRITE",
                    "FINANCE_READ",
                    "HR_READ",
                    "STAFF_INVITE"
                ),
                List.of("PROCUREMENT_READ", "ANALYTICS_OWN", "AI_COPILOT"),
                false,
                roleProfileForTemplate(
                    "Restaurant Manager",
                    List.of("POS_ACCESS", "EBM_SUBMIT", "INVENTORY_READ", "INVENTORY_WRITE", "FINANCE_READ", "HR_READ", "STAFF_INVITE"),
                    List.of("PROCUREMENT_READ", "ANALYTICS_OWN", "AI_COPILOT"),
                    "STATIC_TEMPLATE"
                )
            ),
            new RoleTemplate(
                "Cashier",
                "Takes orders and payments",
                "🧾",
                "#22c55e",
                POS_ALWAYS,
                List.of(),
                false,
                roleProfileForTemplate("Cashier", POS_ALWAYS, List.of(), "STATIC_TEMPLATE")
            )
        );
    }

    private RoleTemplate ownerTemplate() {
        List<String> allCodes = permissionRepository.findAll().stream()
            .filter(permission -> permission.getTenantId() == null)
            .map(Permission::getCode)
            .sorted(Comparator.naturalOrder())
            .toList();
        return new RoleTemplate(
            "Business Owner",
            "Full access to all features and settings",
            "👑",
            "#6366f1",
            new ArrayList<>(allCodes),
            List.of(),
            true,
            roleProfileForTemplate("Business Owner", allCodes, List.of(), "STATIC_TEMPLATE")
        );
    }

    private com.smartaccounting.dto.rbac.RoleProfileConfig roleProfileForTemplate(
        String roleName,
        List<String> alwaysPermissions,
        List<String> optionalPermissions,
        String source
    ) {
        List<String> allCodes = new ArrayList<>(alwaysPermissions);
        allCodes.addAll(optionalPermissions);
        return roleProfileService.resolveForPersist(
            null,
            allCodes,
            roleName,
            source
        ).profile();
    }
}
