package com.smartaccounting.integration;

import com.smartaccounting.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifies DB-backed {@link com.smartaccounting.security.PermissionGuard} on migrated endpoints
 * using demo tenant users after V82 role migration (Flyway + V41 seed).
 */
@SpringBootTest
@AutoConfigureMockMvc
class RbacEndpointAccessIT extends AbstractPostgresSpringBootIntegrationTest {

    private static final String DEMO_TENANT = "11111111-1111-4111-8111-111111111111";
    private static final String DEMO_BARCODE = "5901234123460";

    private static final Map<String, String> DEMO_USER_IDS = Map.of(
        "ceo", "33333333-3333-4333-8333-333333333301",
        "cfo", "33333333-3333-4333-8333-333333333302",
        "sales", "33333333-3333-4333-8333-333333333303",
        "ops", "33333333-3333-4333-8333-333333333304",
        "hr", "33333333-3333-4333-8333-333333333305",
        "marketing", "33333333-3333-4333-8333-333333333306",
        "accounting", "33333333-3333-4333-8333-333333333307"
    );

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Test
    void salesUserCanAccessPosCatalog() throws Exception {
        mockMvc.perform(get("/api/v1/pos/catalog/scan")
                .param("barcode", DEMO_BARCODE)
                .header("Authorization", "Bearer " + tokenFor("sales")))
            .andExpect(status().isOk());
    }

    @Test
    void hrUserDeniedPosCatalog() throws Exception {
        mockMvc.perform(get("/api/v1/pos/catalog/scan")
                .param("barcode", DEMO_BARCODE)
                .header("Authorization", "Bearer " + tokenFor("hr")))
            .andExpect(status().isForbidden());
    }

    @Test
    void cfoCanAccessFinanceVatCalendar() throws Exception {
        mockMvc.perform(get("/api/v1/compliance/vat/calendar")
                .header("Authorization", "Bearer " + tokenFor("cfo")))
            .andExpect(status().isOk());
    }

    @Test
    void salesUserDeniedFinanceVatCalendar() throws Exception {
        mockMvc.perform(get("/api/v1/compliance/vat/calendar")
                .header("Authorization", "Bearer " + tokenFor("sales")))
            .andExpect(status().isForbidden());
    }

    @Test
    void accountingUserCanAccessComplianceVatCalendar() throws Exception {
        mockMvc.perform(get("/api/v1/compliance/vat/calendar")
                .header("Authorization", "Bearer " + tokenFor("accounting")))
            .andExpect(status().isOk());
    }

    @Test
    void opsUserCanAccessInventoryBalances() throws Exception {
        mockMvc.perform(get("/api/v1/inventory/balances")
                .header("Authorization", "Bearer " + tokenFor("ops")))
            .andExpect(status().isOk());
    }

    @Test
    void marketingUserDeniedInventoryWrite() throws Exception {
        mockMvc.perform(post("/api/v1/inventory/move")
                .header("Authorization", "Bearer " + tokenFor("marketing"))
                .contentType("application/json")
                .content("""
                    {
                      "productId":"22222222-2222-4222-8222-222222222204",
                      "fromLocation":"SHOP",
                      "toLocation":"WAREHOUSE",
                      "quantity":1
                    }
                    """))
            .andExpect(status().isForbidden());
    }

    private String tokenFor(String username) {
        String userId = DEMO_USER_IDS.get(username);
        if (userId == null) {
            throw new IllegalArgumentException("Unknown demo user: " + username);
        }
        return jwtService.generateToken(
            userDetailsService.loadUserByUsername(username),
            DEMO_TENANT,
            userId
        );
    }
}
