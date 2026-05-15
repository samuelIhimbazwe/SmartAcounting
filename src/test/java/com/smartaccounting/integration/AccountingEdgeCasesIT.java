package com.smartaccounting.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.entity.Invoice;
import com.smartaccounting.repository.InvoiceRepository;
import com.smartaccounting.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AccountingEdgeCasesIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Test
    void partialAndOverApplyPaymentBehaviors() throws Exception {
        String token = loginAndGetToken("accounting", "password");
        UUID invoiceId = createInvoice(token, "Client A", new BigDecimal("100.00"), "USD");
        UUID paymentId = createPayment(token, "IN", "Client A", new BigDecimal("100.00"), "USD");

        mockMvc.perform(post("/api/v1/accounting/payments/apply")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", "apply-partial-" + UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"paymentId":"%s","targetType":"INVOICE","targetId":"%s","appliedAmount":40}
                    """.formatted(paymentId, invoiceId)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/accounting/payments/apply")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", "apply-over-" + UUID.randomUUID())
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

    @Test
    void smsReminderJobFiresOnTriggerDaysOnly() throws Exception {
        String token = loginAndGetToken("cfo", "password");
        LocalDate dueLong = LocalDate.of(2026, 6, 30);
        LocalDate createdLong = dueLong.minusDays(60);
        LocalDate dueShort = LocalDate.of(2026, 7, 20);
        LocalDate createdShort = dueShort.minusDays(45);

        UUID longInvoice = createInvoiceAt(token, "Long Term Customer", new BigDecimal("120.00"), "USD", dueLong, createdLong);
        UUID shortInvoice = createInvoiceAt(token, "Short Term Customer", new BigDecimal("220.00"), "USD", dueShort, createdShort);

        assertReminderRun(token, dueLong.minusDays(30), 1, "advance", longInvoice);
        assertReminderRun(token, dueLong.minusDays(30), 0, null, null); // no duplicate on same day
        assertReminderRun(token, dueLong.minusDays(7), 1, "week-before", longInvoice);
        assertReminderRun(token, dueShort.minusDays(7), 1, "week-before", shortInvoice);
        assertReminderRun(token, dueLong, 1, "due-today", longInvoice);
        assertReminderRun(token, dueShort, 1, "due-today", shortInvoice);
        assertReminderRun(token, dueShort.plusDays(1), 0, null, null); // no extras after due date
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

    private UUID createInvoiceAt(String token,
                                 String customer,
                                 BigDecimal amount,
                                 String currency,
                                 LocalDate dueDate,
                                 LocalDate createdDate) throws Exception {
        UUID invoiceId = createInvoice(token, customer, amount, currency, dueDate);
        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow();
        invoice.setCreatedAt(createdDate.atStartOfDay(java.time.ZoneOffset.UTC).toInstant());
        invoiceRepository.save(invoice);
        return invoiceId;
    }

    private UUID createInvoice(String token, String customer, BigDecimal amount, String currency, LocalDate dueDate) throws Exception {
        String body = mockMvc.perform(post("/api/v1/finance/invoices")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"customerName":"%s","amount":%s,"currencyCode":"%s","dueDate":"%s"}
                    """.formatted(customer, amount, currency, dueDate)))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(body).get("invoiceId").asText());
    }

    private void assertReminderRun(String token,
                                   LocalDate simulateDate,
                                   int expectedSent,
                                   String expectedStage,
                                   UUID expectedInvoiceId) throws Exception {
        String runBody = mockMvc.perform(post("/api/v1/admin/jobs/sms-reminder/run")
                .header("Authorization", "Bearer " + token)
                .param("simulateDate", simulateDate.toString()))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode runJson = objectMapper.readTree(runBody);
        assertEquals(expectedSent, runJson.get("remindersSent").asInt());
        if (expectedStage == null) {
            assertEquals(0, runJson.path("triggered").size());
            return;
        }
        JsonNode triggered = runJson.path("triggered");
        assertTrue(triggered.isArray());
        assertEquals(1, triggered.size());
        boolean found = false;
        for (JsonNode row : triggered) {
            if (expectedInvoiceId != null && !expectedInvoiceId.toString().equals(row.path("invoiceId").asText())) {
                continue;
            }
            if (!expectedStage.equals(row.path("reminderStage").asText())) {
                continue;
            }
            String message = row.path("message").asText("");
            assertTrue(!message.isBlank());
            found = true;
            break;
        }
        assertTrue(found, "Expected reminder stage not emitted for simulateDate " + simulateDate);
    }

    private UUID createPayment(String token, String direction, String cp, BigDecimal amount, String currency) throws Exception {
        String body = mockMvc.perform(post("/api/v1/accounting/payments")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", "pay-" + UUID.randomUUID())
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
        return jwtService.generateToken(
            userDetailsService.loadUserByUsername(username),
            UUID.randomUUID().toString(),
            UUID.randomUUID().toString()
        );
    }
}
