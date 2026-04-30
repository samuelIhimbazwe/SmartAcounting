package com.smartchain.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartchain.entity.EventLog;
import com.smartchain.repository.EventLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TenantClaimsIsolationIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EventLogRepository eventLogRepository;

    @Test
    void eventWritesUseTenantFromJwtClaims() throws Exception {
        UUID tenantA = UUID.randomUUID();
        UUID tenantB = UUID.randomUUID();

        String tokenA = loginAndGetToken("ceo", "password", tenantA, UUID.randomUUID());
        String tokenB = loginAndGetToken("ceo", "password", tenantB, UUID.randomUUID());

        appendEvent(tokenA, UUID.randomUUID(), 1500);
        appendEvent(tokenB, UUID.randomUUID(), 2300);

        List<EventLog> logs = eventLogRepository.findAll();
        Set<UUID> tenantIds = logs.stream().map(EventLog::getTenantId).collect(Collectors.toSet());

        assertTrue(tenantIds.contains(tenantA));
        assertTrue(tenantIds.contains(tenantB));
    }

    private void appendEvent(String token, UUID aggregateId, int amount) throws Exception {
        String body = """
            {
              "aggregateType": "REVENUE",
              "aggregateId": "%s",
              "eventType": "INVOICE_ISSUED",
              "payload": {"amount": %d}
            }
            """.formatted(aggregateId, amount);
        mockMvc.perform(post("/api/v1/events")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
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
