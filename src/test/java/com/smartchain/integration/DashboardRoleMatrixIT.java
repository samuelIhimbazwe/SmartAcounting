package com.smartchain.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DashboardRoleMatrixIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void fullRoleDashboardAccessMatrixIsEnforced() throws Exception {
        Map<String, String> userToScope = Map.of(
            "ceo", "ceo",
            "cfo", "cfo",
            "sales", "sales",
            "ops", "operations",
            "hr", "hr",
            "marketing", "marketing",
            "accounting", "accounting"
        );
        String[] dashboards = {"ceo", "cfo", "sales", "operations", "hr", "marketing", "accounting"};

        Map<String, String> tokens = new LinkedHashMap<>();
        for (String username : userToScope.keySet()) {
            tokens.put(username, loginAndGetToken(username, "password"));
        }

        for (Map.Entry<String, String> entry : userToScope.entrySet()) {
            String username = entry.getKey();
            String scope = entry.getValue();
            String token = tokens.get(username);
            for (String dashboard : dashboards) {
                var request = get("/api/v1/dashboards/" + dashboard + "/kpis")
                    .header("Authorization", "Bearer " + token);
                if ("ceo".equals(username) || scope.equals(dashboard)) {
                    mockMvc.perform(request).andExpect(status().isOk());
                } else {
                    mockMvc.perform(request).andExpect(status().isForbidden());
                }
            }
        }
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        String requestBody = """
            {
              "username": "%s",
              "password": "%s",
              "tenantId": "%s",
              "userId": "%s"
            }
            """.formatted(username, password, UUID.randomUUID(), UUID.randomUUID());

        String body = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        JsonNode jsonNode = objectMapper.readTree(body);
        return jsonNode.get("token").asText();
    }
}
