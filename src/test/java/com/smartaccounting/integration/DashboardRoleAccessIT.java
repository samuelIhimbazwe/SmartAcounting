package com.smartaccounting.integration;

import com.smartaccounting.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DashboardRoleAccessIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Test
    void ceoCanAccessCfoDashboard() throws Exception {
        String token = loginAndGetToken("ceo", "password");
        mockMvc.perform(get("/api/v1/dashboards/cfo/kpis")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    @Test
    void salesCannotAccessCfoDashboard() throws Exception {
        String token = loginAndGetToken("sales", "password");
        mockMvc.perform(get("/api/v1/dashboards/cfo/kpis")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void cfoCanAccessCfoDashboard() throws Exception {
        String token = loginAndGetToken("cfo", "password");
        mockMvc.perform(get("/api/v1/dashboards/cfo/kpis")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    private String loginAndGetToken(String username, String password) throws Exception {
        return jwtService.generateToken(
            userDetailsService.loadUserByUsername(username),
            UUID.randomUUID().toString(),
            UUID.randomUUID().toString()
        );
    }
}
