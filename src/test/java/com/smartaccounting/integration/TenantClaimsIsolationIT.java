package com.smartaccounting.integration;

import com.smartaccounting.entity.EventLog;
import com.smartaccounting.repository.EventLogRepository;
import com.smartaccounting.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
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
class TenantClaimsIsolationIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EventLogRepository eventLogRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

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
        return jwtService.generateToken(
            userDetailsService.loadUserByUsername(username),
            tenantId.toString(),
            userId.toString()
        );
    }
}
