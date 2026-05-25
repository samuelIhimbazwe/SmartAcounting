package com.smartaccounting.integration;

import com.smartaccounting.dto.rbac.RoleSetupItem;
import com.smartaccounting.dto.rbac.TenantSetupRequest;
import com.smartaccounting.entity.BusinessSize;
import com.smartaccounting.entity.BusinessType;
import com.smartaccounting.repository.PermissionRepository;
import com.smartaccounting.repository.RoleRepository;
import com.smartaccounting.repository.UserRoleRepository;
import com.smartaccounting.service.TenantOnboardingService;
import com.smartaccounting.service.rbac.RoleTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("integration")
@ActiveProfiles("it")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Testcontainers(disabledWithoutDocker = true)
class TenantOnboardingServiceIT {

  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
      DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres")
  )
      .withDatabaseName("smartchain")
      .withUsername("smartchain")
      .withPassword("smartchain");

  @DynamicPropertySource
  static void datasourceProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
  }

  @Autowired
  private TenantOnboardingService tenantOnboardingService;

  @Autowired
  private PermissionRepository permissionRepository;

  @Autowired
  private RoleRepository roleRepository;

  @Autowired
  private UserRoleRepository userRoleRepository;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  private UUID tenantId;
  private UUID ceoUserId;

  @BeforeEach
  void seedTenant() {
    tenantId = UUID.randomUUID();
    ceoUserId = UUID.randomUUID();
    jdbcTemplate.update(
        """
            insert into tenants (id, name, status, created_at, plan, phone_verified)
            values (?, 'Onboarding Test Co', 'TRIAL', now(), 'TRIAL', false)
            """,
        tenantId
    );
    jdbcTemplate.update(
        """
            insert into users (id, tenant_id, username, role, created_at, self_service_owner)
            values (?, ?, 'owner@onboarding.test', 'CEO', now(), true)
            """,
        ceoUserId,
        tenantId
    );
  }

  @Test
  void getRecommendationRetailSmallReturnsThreeTemplates() {
    List<RoleTemplate> templates = tenantOnboardingService.getRecommendation(
        tenantId,
        BusinessSize.SMALL,
        BusinessType.RETAIL
    );
    assertThat(templates).hasSize(3);
    assertThat(templates.stream().filter(RoleTemplate::isOwner).count()).isEqualTo(1);
  }

  @Test
  void saveSetupRetailSmallCreatesThreeRolesWithOwnerPermissionsAndCeoAssignment() {
    assertThat(permissionRepository.count()).isEqualTo(28);

    TenantSetupRequest request = requestFromRecommendation();
    var created = tenantOnboardingService.saveSetup(tenantId, request);

    assertThat(created).hasSize(3);
    assertThat(roleRepository.countByTenantId(tenantId)).isEqualTo(3);

    var owner = created.stream().filter(r -> r.isOwner()).findFirst().orElseThrow();
    assertThat(owner.permissions()).hasSize(28);
    assertThat(userRoleRepository.existsById_UserIdAndId_RoleId(ceoUserId, owner.id())).isTrue();
    assertThat(tenantOnboardingService.isSetupComplete(tenantId)).isTrue();
  }

  @Test
  void rerunningSetupDoesNotCreateDuplicateRoles() {
    TenantSetupRequest request = requestFromRecommendation();
    tenantOnboardingService.saveSetup(tenantId, request);
    UUID ownerRoleId = roleRepository.findByTenantIdAndIsOwnerTrue(tenantId).orElseThrow().getId();

    tenantOnboardingService.saveSetup(tenantId, request);

    assertThat(roleRepository.countByTenantId(tenantId)).isEqualTo(3);
    assertThat(roleRepository.findByTenantIdAndIsOwnerTrue(tenantId).orElseThrow().getId())
        .isEqualTo(ownerRoleId);
  }

  private TenantSetupRequest requestFromRecommendation() {
    List<RoleTemplate> templates = tenantOnboardingService.getRecommendation(
        tenantId,
        BusinessSize.SMALL,
        BusinessType.RETAIL
    );
    List<RoleSetupItem> items = templates.stream().map(this::toSetupItem).toList();
    return new TenantSetupRequest(BusinessSize.SMALL, BusinessType.RETAIL, items);
  }

  private RoleSetupItem toSetupItem(RoleTemplate template) {
    List<String> codes = new ArrayList<>(template.alwaysPermissions());
    codes.addAll(template.optionalPermissions());
    return new RoleSetupItem(
        template.name(),
        template.description(),
        template.emoji(),
        template.colour(),
        codes,
        template.isOwner(),
        template.roleProfile()
    );
  }
}
