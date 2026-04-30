package com.smartchain.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.entity.AuditLog;
import com.smartchain.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AcceptanceCriteriaIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Test
    void roleDataIsolationIsEnforcedOnDashboardApis() throws Exception {
        String salesToken = loginAndGetToken("sales", "password");
        String cfoToken = loginAndGetToken("cfo", "password");

        mockMvc.perform(get("/api/v1/dashboards/cfo/kpis")
                .header("Authorization", "Bearer " + salesToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/dashboards/cfo/kpis")
                .header("Authorization", "Bearer " + cfoToken))
            .andExpect(status().isOk());
    }

    @Test
    void kpiLoadMeetsPerformanceSmokeTarget() throws Exception {
        String cfoToken = loginAndGetToken("cfo", "password");
        long start = System.nanoTime();
        mockMvc.perform(get("/api/v1/dashboards/cfo/kpis")
                .header("Authorization", "Bearer " + cfoToken))
            .andExpect(status().isOk());
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;
        assertTrue(elapsedMs < 500, "KPI endpoint should be under 500ms in local test profile. Actual: " + elapsedMs + "ms");
    }

    @Test
    void copilotResponseMeetsFirstTokenSmokeBudget() throws Exception {
        String cfoToken = loginAndGetToken("cfo", "password");
        long start = System.nanoTime();
        mockMvc.perform(post("/api/v1/ai/copilot/query")
                .header("Authorization", "Bearer " + cfoToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"cfo\",\"question\":\"Why is DSO up?\"}"))
            .andExpect(status().isOk());
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;
        assertTrue(elapsedMs < 1500, "Copilot endpoint should respond within 1.5s smoke budget. Actual: " + elapsedMs + "ms");
    }

    @Test
    void auditCompletenessCoversDashboardAiAndActionFlows() throws Exception {
        String cfoToken = loginAndGetToken("cfo", "password");

        mockMvc.perform(get("/api/v1/dashboards/cfo/kpis")
                .header("Authorization", "Bearer " + cfoToken))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/ai/copilot/query")
                .header("Authorization", "Bearer " + cfoToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"cfo\",\"question\":\"variance summary\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/dashboards/actions/APPROVAL")
                .header("Authorization", "Bearer " + cfoToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"APPROVAL\",\"actionId\":\"act-1\"}"))
            .andExpect(status().isOk());

        List<AuditLog> logs = auditLogRepository.findAll();
        Set<String> actions = logs.stream().map(AuditLog::getAction).collect(Collectors.toSet());

        assertTrue(actions.contains("VIEW_DASHBOARD"));
        assertTrue(actions.contains("AI_QUERY"));
        assertTrue(actions.contains("APPROVE_ACTION"));
    }

    @Test
    void exportAndUnauthorizedPathsRemainProtected() throws Exception {
        String accountingToken = loginAndGetToken("accounting", "password");
        mockMvc.perform(get("/api/v1/dashboards/accounting/actions")
                .header("Authorization", "Bearer " + accountingToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/dashboards/accounting/actions"))
            .andExpect(status().isUnauthorized());
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

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        return response.get("token").asText();
    }
}
