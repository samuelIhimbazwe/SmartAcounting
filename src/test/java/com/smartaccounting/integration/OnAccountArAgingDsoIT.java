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
class OnAccountArAgingDsoIT extends AbstractPostgresSpringBootIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private JwtService jwtService;
    @Autowired private UserDetailsService userDetailsService;

    @Test
    void onAccountToAgingToDsoEndToEnd() throws Exception {
        UUID tenantId = UUID.randomUUID();
        String salesToken = tokenFor("sales", tenantId);
        String cfoToken = tokenFor("cfo", tenantId);
        String customer = "AR Customer " + UUID.randomUUID();

        // Seed customer and increase credit limit so ON_ACCOUNT checkout can create AR invoice.
        mockMvc.perform(post("/api/v1/finance/invoices")
                .header("Authorization", "Bearer " + cfoToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"customerName":"%s","amount":0.00,"currencyCode":"RWF","dueDate":"%s"}
                    """.formatted(customer, LocalDate.now().plusDays(14))))
            .andExpect(status().isOk());
        String seededInvoices = mockMvc.perform(get("/api/v1/finance/invoices")
                .header("Authorization", "Bearer " + cfoToken)
                .param("customerName", customer))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        UUID customerId = UUID.fromString(objectMapper.readTree(seededInvoices).get(0).get("customerId").asText());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/finance/customers/{id}", customerId)
                .header("Authorization", "Bearer " + cfoToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"creditLimit\":1000.00}"))
            .andExpect(status().isOk());

        // POS ON_ACCOUNT checkout -> AR invoice
        String barcode = "BC-" + UUID.randomUUID().toString().substring(0, 8);
        mockMvc.perform(post("/api/v1/pos/catalog/items")
                .header("Authorization", "Bearer " + salesToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"barcode":"%s","sku":"SKU-AR","displayName":"AR Item","unitPrice":100.00,"currencyCode":"RWF"}
                    """.formatted(barcode)))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/pos/checkout")
                .header("Authorization", "Bearer " + salesToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "customerName":"Walk-in",
                      "currencyCode":"RWF",
                      "posRegisterCode":"REG-AR",
                      "lines":[{"barcode":"%s","quantity":1}],
                      "tenders":[{"tenderType":"ON_ACCOUNT","amount":100.00}],
                      "onAccountCustomerName":"%s",
                      "managerOverride":false
                    }
                    """.formatted(barcode, customer)))
            .andExpect(status().isOk());

        String invoicesBody = mockMvc.perform(get("/api/v1/finance/invoices")
                .header("Authorization", "Bearer " + cfoToken)
                .param("customerName", customer))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode invoices = objectMapper.readTree(invoicesBody);
        assertTrue(invoices.isArray() && invoices.size() >= 1);
        JsonNode invoiceJson = null;
        for (JsonNode row : invoices) {
            if (row.path("amount").decimalValue().compareTo(new BigDecimal("100.00")) == 0) {
                invoiceJson = row;
                break;
            }
        }
        assertTrue(invoiceJson != null, "Expected ON_ACCOUNT invoice amount 100.00");
        UUID invoiceId = UUID.fromString(invoiceJson.get("invoiceId").asText());
        LocalDate dueDate = LocalDate.parse(invoiceJson.get("dueDate").asText());
        assertEquals(LocalDate.now().plusDays(14), dueDate);

        // Rebuild projections via admin endpoint and verify AR aging from Sales dashboard KPI widget payload.
        rebuildProjections(cfoToken);
        BigDecimal bucket0to30 = readSalesAgingBucket(salesToken, "bucket0to30");
        assertTrue(bucket0to30.compareTo(new BigDecimal("100.00")) >= 0);

        // Time simulation helper: set due date directly to overdue by 35 days
        setInvoiceDueDate(invoiceId, LocalDate.now().minusDays(35));
        rebuildProjections(cfoToken);
        BigDecimal bucket31to60 = readSalesAgingBucket(salesToken, "bucket31to60");
        assertTrue(bucket31to60.compareTo(new BigDecimal("100.00")) >= 0);

        BigDecimal dsoBefore = readCfoDso(cfoToken);

        // Pay invoice in full
        String payBody = mockMvc.perform(post("/api/v1/accounting/payments")
                .header("Authorization", "Bearer " + cfoToken)
                .header("Idempotency-Key", "pay-" + invoiceId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"direction":"IN","counterparty":"%s","amount":100.00,"currencyCode":"RWF"}
                    """.formatted(customer)))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        UUID paymentId = UUID.fromString(objectMapper.readTree(payBody).get("paymentId").asText());

        mockMvc.perform(post("/api/v1/accounting/payments/apply")
                .header("Authorization", "Bearer " + cfoToken)
                .header("Idempotency-Key", "apply-" + invoiceId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"paymentId":"%s","targetType":"INVOICE","targetId":"%s","appliedAmount":100.00}
                    """.formatted(paymentId, invoiceId)))
            .andExpect(status().isOk());

        String paidInvoices = mockMvc.perform(get("/api/v1/finance/invoices")
                .header("Authorization", "Bearer " + cfoToken)
                .param("customerName", customer)
                .param("status", "PAID"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode paidRows = objectMapper.readTree(paidInvoices);
        assertTrue(paidRows.isArray() && paidRows.size() >= 1);

        rebuildProjections(cfoToken);
        BigDecimal dsoAfter = readCfoDso(cfoToken);
        assertTrue(dsoAfter.compareTo(dsoBefore) < 0, "DSO should reduce after invoice is paid");
    }

    private String tokenFor(String username, UUID tenantId) {
        return jwtService.generateToken(
            userDetailsService.loadUserByUsername(username),
            tenantId.toString(),
            UUID.randomUUID().toString()
        );
    }

    private void setInvoiceDueDate(UUID invoiceId, LocalDate dueDate) {
        Invoice invoice = invoiceRepository.findById(invoiceId).orElseThrow();
        invoice.setDueDate(dueDate);
        invoiceRepository.save(invoice);
    }

    private void rebuildProjections(String token) throws Exception {
        mockMvc.perform(post("/api/v1/admin/projections/rebuild")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }

    private BigDecimal readCfoDso(String token) throws Exception {
        String body = mockMvc.perform(get("/api/v1/dashboards/cfo/kpis")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode rows = objectMapper.readTree(body);
        for (JsonNode row : rows) {
            if ("cfo_snapshot".equals(row.path("key").asText())) {
                JsonNode payload = objectMapper.readTree(row.path("value").asText("{}"));
                return payload.path("dsoDays").decimalValue();
            }
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal readSalesAgingBucket(String token, String bucketKey) throws Exception {
        String body = mockMvc.perform(get("/api/v1/dashboards/sales/kpis")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode rows = objectMapper.readTree(body);
        for (JsonNode row : rows) {
            if ("ar_aging".equals(row.path("key").asText())) {
                JsonNode payload = objectMapper.readTree(row.path("value").asText("{}"));
                return payload.path(bucketKey).decimalValue();
            }
        }
        return BigDecimal.ZERO;
    }
}
