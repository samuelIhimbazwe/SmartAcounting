package com.smartaccounting.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthSetupCompleteIT extends AbstractPostgresSpringBootIntegrationTest {

    private static final String DEMO_TENANT = "11111111-1111-4111-8111-111111111111";
    private static final String DEMO_CEO_USER = "33333333-3333-4333-8333-333333333301";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void demoTenantLoginReturnsSetupCompleteTrue() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginPayload("ceo", "password", DEMO_TENANT, DEMO_CEO_USER)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.setupComplete").value(true));
    }

    @Test
    void newTenantLoginReturnsSetupCompleteFalse() throws Exception {
        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String email = "owner-" + tenantId + "@setup.test";
        jdbcTemplate.update(
            """
                insert into tenants (id, name, status, created_at, plan, phone_verified)
                values (?, 'Fresh Signup Co', 'TRIAL', now(), 'TRIAL', true)
                """,
            tenantId
        );
        jdbcTemplate.update(
            """
                insert into users (id, tenant_id, username, role, created_at, password_hash, self_service_owner)
                values (?, ?, ?, 'CEO', now(), ?, true)
                """,
            userId,
            tenantId,
            email,
            passwordEncoder.encode("password")
        );

        String body = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginPayload(email, "password", tenantId.toString(), userId.toString())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.setupComplete").value(false))
            .andReturn()
            .getResponse()
            .getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        assertThat(json.get("setupComplete").asBoolean()).isFalse();
        assertThat(json.get("assignedRoles").size()).isGreaterThanOrEqualTo(0);
    }

    private static String loginPayload(String username, String password, String tenantId, String userId) {
        return """
            {
              "username": "%s",
              "password": "%s",
              "tenantId": "%s",
              "userId": "%s"
            }
            """.formatted(username, password, tenantId, userId);
    }
}
