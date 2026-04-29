package com.smartchain.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AccountingEdgeCasesIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void partialAndOverApplyPaymentBehaviors() throws Exception {
        String token = loginAndGetToken("accounting", "password");
        UUID invoiceId = createInvoice(token, "Client A", new BigDecimal("100.00"), "USD");
        UUID paymentId = createPayment(token, "IN", "Client A", new BigDecimal("100.00"), "USD");

        mockMvc.perform(post("/api/v1/accounting/payments/apply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"paymentId":"%s","targetType":"INVOICE","targetId":"%s","appliedAmount":40}
                    """.formatted(paymentId, invoiceId)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/accounting/payments/apply")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"paymentId":"%s","targetType":"INVOICE","targetId":"%s","appliedAmount":70}
                    """.formatted(paymentId, invoiceId)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void autoMatchIgnoresMismatchedCurrencyAndStatus() throws Exception {
        String token = loginAndGetToken("cfo", "password");
        createInvoice(token, "Client USD", new BigDecimal("100.00"), "USD");
        createInvoice(token, "Client EUR", new BigDecimal("100.00"), "EUR");
        createPayment(token, "IN", "Client USD", new BigDecimal("100.00"), "USD");

        String matchBody = mockMvc.perform(post("/api/v1/accounting/reconciliation/auto-match")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode matched = objectMapper.readTree(matchBody);
        assertTrue(matched.get("matchedItems").asInt() >= 2);

        String unmatchedBody = mockMvc.perform(get("/api/v1/accounting/reconciliation/unmatched")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode unmatched = objectMapper.readTree(unmatchedBody);
        long eurInvoiceUnmatched = 0;
        for (JsonNode item : unmatched) {
            if ("INVOICE".equals(item.path("itemType").asText())) {
                eurInvoiceUnmatched++;
            }
        }
        assertTrue(eurInvoiceUnmatched >= 1);
    }

    @Test
    void closeTaskCycleDetectionIsReported() throws Exception {
        String token = loginAndGetToken("accounting", "password");
        createCloseTask(token, "2026-04", "A", new String[]{"B"});
        createCloseTask(token, "2026-04", "B", new String[]{"A"});

        String body = mockMvc.perform(get("/api/v1/accounting/close/tasks/2026-04/critical-path")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(body);
        assertTrue(json.get("cycleDetected").asBoolean());
        assertEquals(2, json.get("taskCount").asInt());
    }

    private UUID createInvoice(String token, String customer, BigDecimal amount, String currency) throws Exception {
        String body = mockMvc.perform(post("/api/v1/finance/invoices")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"customerName":"%s","amount":%s,"currencyCode":"%s","dueDate":"2026-12-31"}
                    """.formatted(customer, amount, currency)))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("invoiceId").asText());
    }

    private UUID createPayment(String token, String direction, String cp, BigDecimal amount, String currency) throws Exception {
        String body = mockMvc.perform(post("/api/v1/accounting/payments")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"direction":"%s","counterparty":"%s","amount":%s,"currencyCode":"%s"}
                    """.formatted(direction, cp, amount, currency)))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("paymentId").asText());
    }

    private void createCloseTask(String token, String period, String key, String[] deps) throws Exception {
        String depsJson = objectMapper.writeValueAsString(deps);
        mockMvc.perform(post("/api/v1/accounting/close/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"period":"%s","taskKey":"%s","ownerRole":"accounting","dependsOn":%s,"riskScore":3.4}
                    """.formatted(period, key, depsJson)))
            .andExpect(status().isOk());
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
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }
}
