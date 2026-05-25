package com.smartaccounting.service;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("integration")
@ActiveProfiles("it")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Testcontainers(disabledWithoutDocker = true)
class PermissionCatalogServiceIT {

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
    private PermissionCatalogService permissionCatalogService;

    @Test
    void legacyCodesDoNotExistInCatalog() {
        List<String> legacyCodes = List.of(
            "FEATURE_FLAG_WRITE",
            "FEATURE_FLAG_READ",
            "ASSET_READ",
            "ASSET_WRITE",
            "ADMIN_TENANT_WRITE",
            "ADMIN_TENANT_READ",
            "ADMIN_USER_WRITE",
            "ADMIN_USER_READ",
            "ROLE_WRITE",
            "ROLE_READ",
            "ADMIN_SECURITY_WRITE",
            "PROJECTION_REBUILD",
            "DOCUMENT_READ",
            "DOCUMENT_WRITE"
        );

        for (String code : legacyCodes) {
            assertThat(permissionCatalogService.exists(code))
                .as("Legacy code '%s' should not exist in catalog", code)
                .isFalse();
        }
    }

    @Test
    void allCatalogCodesExistAfterMigrations() {
        List<String> catalogCodes = List.of(
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

        for (String code : catalogCodes) {
            assertThat(permissionCatalogService.exists(code))
                .as("Catalog code '%s' missing after migrations", code)
                .isTrue();
        }
    }
}
