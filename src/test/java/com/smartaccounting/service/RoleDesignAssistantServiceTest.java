package com.smartaccounting.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.copilot.CompletionService;
import com.smartaccounting.dto.rbac.DesignRoleRequest;
import com.smartaccounting.dto.rbac.RoleDesignSuggestionResponse;
import com.smartaccounting.entity.Permission;
import com.smartaccounting.entity.Role;
import com.smartaccounting.repository.PermissionRepository;
import com.smartaccounting.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;

@ExtendWith(MockitoExtension.class)
class RoleDesignAssistantServiceTest {

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PermissionRepository permissionRepository;
    @Mock
    private RolePermissionSuggestionService rolePermissionSuggestionService;
    @Mock
    private CompletionService completionService;

    @Mock
    private TenantCustomPermissionService tenantCustomPermissionService;
    @Mock
    private RoleProfileService roleProfileService;

    private RoleDesignAssistantService service;
    private final UUID tenantId = UUID.fromString("11111111-1111-4111-8111-111111111111");

    @BeforeEach
    void setUp() {
        service = new RoleDesignAssistantService(
            roleRepository,
            permissionRepository,
            rolePermissionSuggestionService,
            tenantCustomPermissionService,
            completionService,
            new ObjectMapper(),
            roleProfileService
        );
        when(permissionRepository.findAll()).thenReturn(catalog());
        when(roleProfileService.resolveForPersist(any(), any(), anyString(), anyString()))
            .thenAnswer(invocation -> new RoleProfileService.ResolvedRoleProfile(
                com.smartaccounting.dto.rbac.RoleProfileConfig.empty(),
                new java.util.ArrayList<>((java.util.Collection<String>) invocation.getArgument(1))
            ));
        when(tenantCustomPermissionService.ensureCustomPermission(
            any(), any(), any(), any(), any()
        )).thenAnswer(invocation -> {
            String label = invocation.getArgument(1);
            Permission p = perm("CUSTOM_TEST");
            p.setLabel(label);
            p.setTenantId(tenantId);
            return p;
        });
        when(completionService.completeAnthropic(anyString(), anyString())).thenReturn(Optional.empty());
    }

    @Test
    void designsJuniorAccountantVariantFromExistingRole() {
        Role accountant = role("Accountant", Set.of("FINANCE_READ", "FINANCE_WRITE", "EBM_AUDIT", "REPORTS_EXPORT"));
        when(roleRepository.findAllByTenantId(tenantId)).thenReturn(List.of(accountant));
        when(rolePermissionSuggestionService.suggest("Junior accountant")).thenReturn(
            List.of("FINANCE_READ", "FINANCE_WRITE", "REPORTS_EXPORT")
        );

        RoleDesignSuggestionResponse response = service.design(
            tenantId,
            new DesignRoleRequest(
                "Junior accountant who can view finances but not approve payroll or close period",
                null
            )
        );

        assertThat(response.matchType()).isIn("VARIANT_OF_EXISTING", "NEAREST_EXISTING");
        assertThat(response.suggested().permissionCodes()).contains("FINANCE_READ");
        assertThat(response.suggested().permissionCodes()).doesNotContain("PAYROLL_WRITE", "FINANCE_CLOSE");
        assertThat(response.basedOnRoleName()).isEqualTo("Accountant");
        assertThat(response.suggested().roleProfile()).isNotNull();
    }

    @Test
    void designsCashierRoleFromPrompt() {
        when(roleRepository.findAllByTenantId(tenantId)).thenReturn(List.of());
        when(rolePermissionSuggestionService.suggest(anyString())).thenReturn(List.of("POS_ACCESS"));

        RoleDesignSuggestionResponse response = service.design(
            tenantId,
            new DesignRoleRequest("Night shift cashier — POS and till only, no finance", null)
        );

        assertThat(response.suggested().permissionCodes())
            .containsExactlyInAnyOrder("POS_ACCESS", "POS_TILL_MANAGE", "EBM_SUBMIT");
        assertThat(response.matchType()).isEqualTo("NEW_ROLE");
        assertThat(response.suggested().roleProfile()).isNotNull();
    }

    @Test
    void recommendsDefaultGrantsForCustomCapability() {
        when(roleRepository.findAllByTenantId(tenantId)).thenReturn(List.of());
        when(rolePermissionSuggestionService.suggest(anyString())).thenReturn(List.of("FINANCE_READ"));

        RoleDesignSuggestionResponse response = service.design(
            tenantId,
            new DesignRoleRequest("Finance lead who can approve supplier refunds", null)
        );

        assertThat(response.customPermissions()).isNotEmpty();
        assertThat(response.customPermissions().get(0).optionalGrants())
            .contains("FINANCE_READ", "FINANCE_WRITE");
    }

    private Role role(String name, Set<String> codes) {
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setTenantId(tenantId);
        role.setName(name);
        role.setEmoji("📊");
        role.setColour("#6366f1");
        role.setOwner(false);
        role.setSystem(false);
        Set<Permission> permissions = new LinkedHashSet<>();
        for (String code : codes) {
            Permission p = new Permission();
            p.setCode(code);
            p.setLabel(code);
            permissions.add(p);
        }
        role.setPermissions(permissions);
        return role;
    }

    private static List<Permission> catalog() {
        return List.of(
            perm("POS_ACCESS"),
            perm("POS_TILL_MANAGE"),
            perm("EBM_SUBMIT"),
            perm("FINANCE_READ"),
            perm("FINANCE_WRITE"),
            perm("FINANCE_CLOSE"),
            perm("PROCUREMENT_READ"),
            perm("PROCUREMENT_WRITE"),
            perm("PAYROLL_READ"),
            perm("PAYROLL_WRITE"),
            perm("REPORTS_EXPORT"),
            perm("EBM_AUDIT")
        );
    }

    private static Permission perm(String code) {
        Permission p = new Permission();
        p.setCode(code);
        p.setLabel(code);
        p.setCategory("FINANCE");
        return p;
    }
}
