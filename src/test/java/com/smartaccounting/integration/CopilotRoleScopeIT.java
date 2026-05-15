package com.smartaccounting.integration;

import com.smartaccounting.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CopilotRoleScopeIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Test
    void copilotQueryAllowsOnlyAuthorizedRoleScope() throws Exception {
        String salesToken = loginAndGetToken("sales", "password");
        String ceoToken = loginAndGetToken("ceo", "password");

        mockMvc.perform(post("/api/v1/ai/copilot/query")
                .header("Authorization", "Bearer " + salesToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"sales\",\"question\":\"pipeline status?\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/ai/copilot/query")
                .header("Authorization", "Bearer " + salesToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"cfo\",\"question\":\"dso status?\"}"))
            .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/ai/copilot/query")
                .header("Authorization", "Bearer " + ceoToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"cfo\",\"question\":\"dso status?\"}"))
            .andExpect(status().isOk());
    }

    @Test
    void briefingRespectsRoleScope() throws Exception {
        String hrToken = loginAndGetToken("hr", "password");

        mockMvc.perform(get("/api/v1/ai/briefing/hr")
                .header("Authorization", "Bearer " + hrToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/ai/briefing/cfo")
                .header("Authorization", "Bearer " + hrToken))
            .andExpect(status().isForbidden());
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        return jwtService.generateToken(
            userDetailsService.loadUserByUsername(username),
            UUID.randomUUID().toString(),
            UUID.randomUUID().toString()
        );
    }
}
