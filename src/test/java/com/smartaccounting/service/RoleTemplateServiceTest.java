package com.smartaccounting.service;

import com.smartaccounting.entity.BusinessSize;
import com.smartaccounting.entity.BusinessType;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.repository.PermissionRepository;
import com.smartaccounting.service.rbac.RoleTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoleTemplateServiceTest {

    private static final List<String> ALL_PERMISSION_CODES = List.of(
        "POS_ACCESS",
        "POS_TILL_MANAGE",
        "POS_RETURNS",
        "POS_DISCOUNT",
        "EBM_SUBMIT",
        "EBM_CONFIG",
        "EBM_AUDIT",
        "INVENTORY_READ",
        "INVENTORY_WRITE",
        "INVENTORY_SHRINKAGE",
        "PROCUREMENT_READ",
        "PROCUREMENT_WRITE",
        "FINANCE_READ",
        "FINANCE_WRITE",
        "FINANCE_CLOSE",
        "PAYROLL_READ",
        "PAYROLL_WRITE",
        "HR_READ",
        "HR_WRITE",
        "STAFF_INVITE",
        "ANALYTICS_OWN",
        "ANALYTICS_ALL",
        "REPORTS_EXPORT",
        "AI_COPILOT",
        "ROLE_MANAGE",
        "USER_MANAGE",
        "TENANT_CONFIG",
        "ASSETS_MANAGE"
    );

    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private RoleProfileService roleProfileService;

    @InjectMocks
    private RoleTemplateService roleTemplateService;

    @BeforeEach
    void stubPermissionCatalog() {
        lenient().when(permissionRepository.findAll()).thenReturn(catalogPermissions());
        lenient().when(roleProfileService.resolveForPersist(org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.anyCollection(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString()))
            .thenAnswer(invocation -> new RoleProfileService.ResolvedRoleProfile(
                com.smartaccounting.dto.rbac.RoleProfileConfig.empty(),
                new java.util.ArrayList<>((java.util.Collection<String>) invocation.getArgument(1))
            ));
    }

    @Test
    void retailSmallReturnsExactlyThreeTemplates() {
        List<RoleTemplate> templates = roleTemplateService.getRecommendation(
            BusinessSize.SMALL,
            BusinessType.RETAIL
        );

        assertThat(templates).hasSize(3);
        assertThat(templates.stream().map(RoleTemplate::name).toList())
            .containsExactly("Business Owner", "Store Manager", "Cashier");
    }

    @Test
    void retailSoloReturnsOwnerOnly() {
        List<RoleTemplate> templates = roleTemplateService.getRecommendation(
            BusinessSize.SOLO,
            BusinessType.RETAIL
        );

        assertThat(templates).hasSize(1);
        assertThat(templates.getFirst().isOwner()).isTrue();
        assertThat(templates.getFirst().name()).isEqualTo("Business Owner");
    }

    @Test
    void otherTypeReturnsEmptyList() {
        for (BusinessSize size : BusinessSize.values()) {
            assertThat(roleTemplateService.getRecommendation(size, BusinessType.OTHER))
                .isEmpty();
        }
    }

    @Test
    void ownerTemplateContainsAllTwentyEightPermissionCodes() {
        List<RoleTemplate> templates = roleTemplateService.getRecommendation(
            BusinessSize.SMALL,
            BusinessType.RETAIL
        );

        RoleTemplate owner = templates.stream()
            .filter(RoleTemplate::isOwner)
            .findFirst()
            .orElseThrow();

        assertThat(owner.alwaysPermissions())
            .containsExactlyInAnyOrderElementsOf(ALL_PERMISSION_CODES);
        assertThat(owner.alwaysPermissions()).hasSize(28);
    }

    @Test
    void posAccessImpliesEbmSubmitInAlwaysPermissions() {
        Set<BusinessType> types = EnumSet.complementOf(EnumSet.of(BusinessType.OTHER));
        for (BusinessType type : types) {
            for (BusinessSize size : BusinessSize.values()) {
                for (RoleTemplate template : roleTemplateService.getRecommendation(size, type)) {
                    if (template.alwaysPermissions().contains("POS_ACCESS")) {
                        assertThat(template.alwaysPermissions())
                            .as("template %s for %s/%s", template.name(), type, size)
                            .contains("EBM_SUBMIT");
                    }
                }
            }
        }
    }

    @Test
    void foodLargeFallsBackToFoodMediumTemplates() {
        List<RoleTemplate> medium = roleTemplateService.getRecommendation(
            BusinessSize.MEDIUM,
            BusinessType.FOOD
        );
        List<RoleTemplate> large = roleTemplateService.getRecommendation(
            BusinessSize.LARGE,
            BusinessType.FOOD
        );

        assertThat(large).isEqualTo(medium);
        assertThat(large).hasSize(3);
        assertThat(large.stream().map(RoleTemplate::name).toList())
            .containsExactly("Business Owner", "Restaurant Manager", "Cashier");
    }

    @Test
    void retailMediumStoreManagerHasExpectedPermissions() {
        RoleTemplate storeManager = roleTemplateService.getRecommendation(
            BusinessSize.MEDIUM,
            BusinessType.RETAIL
        ).stream()
            .filter(t -> "Store Manager".equals(t.name()))
            .findFirst()
            .orElseThrow();

        assertThat(storeManager.alwaysPermissions())
            .containsExactlyInAnyOrder(
                "POS_ACCESS",
                "EBM_SUBMIT",
                "FINANCE_READ",
                "HR_READ",
                "STAFF_INVITE"
            );
    }

    private static List<Permission> catalogPermissions() {
        return ALL_PERMISSION_CODES.stream()
            .map(RoleTemplateServiceTest::permissionWithCode)
            .toList();
    }

    private static Permission permissionWithCode(String code) {
        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setCode(code);
        permission.setLabel(code);
        permission.setCategory("TEST");
        permission.setCreatedAt(LocalDateTime.now());
        return permission;
    }
}
