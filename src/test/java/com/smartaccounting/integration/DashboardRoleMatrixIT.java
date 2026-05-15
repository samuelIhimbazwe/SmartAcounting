package com.smartaccounting.integration;

import com.smartaccounting.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DashboardRoleMatrixIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

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
        return jwtService.generateToken(
            userDetailsService.loadUserByUsername(username),
            UUID.randomUUID().toString(),
            UUID.randomUUID().toString()
        );
    }
}
