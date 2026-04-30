package com.smartchain.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CopilotAgentRunIsolationIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void agentRunStatusIsIsolatedByUserWithinSameTenant() throws Exception {
        UUID tenantId = UUID.randomUUID();
        String tokenA = loginAndGetToken("ceo", "password", tenantId, UUID.randomUUID());
        String tokenB = loginAndGetToken("ceo", "password", tenantId, UUID.randomUUID());

        String runBody = mockMvc.perform(post("/api/v1/ai/copilot/agent/run")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"role":"ceo","question":"forecast runway risk","dryRun":true}
                    """))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String runId = objectMapper.readTree(runBody).get("runId").asText();

        mockMvc.perform(get("/api/v1/ai/copilot/agent/runs/" + runId)
                .header("Authorization", "Bearer " + tokenB))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void agentRunListReturnsOnlyCurrentUsersRuns() throws Exception {
        UUID tenantId = UUID.randomUUID();
        String tokenA = loginAndGetToken("ceo", "password", tenantId, UUID.randomUUID());
        String tokenB = loginAndGetToken("ceo", "password", tenantId, UUID.randomUUID());

        String runBody = mockMvc.perform(post("/api/v1/ai/copilot/agent/run")
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"role":"ceo","question":"dashboard kpi briefing","dryRun":true}
                    """))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        String runId = objectMapper.readTree(runBody).get("runId").asText();

        String listBody = mockMvc.perform(get("/api/v1/ai/copilot/agent/runs")
                .header("Authorization", "Bearer " + tokenB))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        JsonNode list = objectMapper.readTree(listBody);
        assertFalse(list.toString().contains(runId), "User B should not see user A run IDs");
    }

    private String loginAndGetToken(String username, String password, UUID tenantId, UUID userId) throws Exception {
        String requestBody = """
            {
              "username": "%s",
              "password": "%s",
              "tenantId": "%s",
              "userId": "%s"
            }
            """.formatted(username, password, tenantId, userId);

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
