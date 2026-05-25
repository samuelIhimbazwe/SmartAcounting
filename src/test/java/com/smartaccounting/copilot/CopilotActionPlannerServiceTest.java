package com.smartaccounting.copilot;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CopilotActionPlannerServiceTest {
    private final CopilotActionPlannerService service = new CopilotActionPlannerService();

    @Test
    void plansExecutableInvoiceActionWhenPromptHasRequiredFields() {
        CopilotActionPlan plan = service.plan(
            "cfo",
            "Create invoice for Acme Ltd amount 125000 RWF due 2026-06-15",
            Map.of("sectionKey", "invoice")
        ).orElseThrow();

        assertThat(plan.type()).isEqualTo("CREATE_INVOICE");
        assertThat(plan.permissionCode()).isEqualTo("FINANCE_WRITE");
        assertThat(plan.executable()).isTrue();
        assertThat(plan.payload()).containsEntry("customerName", "Acme Ltd");
        assertThat(plan.payload()).containsEntry("currencyCode", "RWF");
        assertThat(plan.payload()).containsEntry("dueDate", "2026-06-15");
    }

    @Test
    void returnsPreviewForInvoiceWhenFieldsAreMissing() {
        CopilotActionPlan plan = service.plan(
            "cfo",
            "Create invoice for Acme Ltd",
            Map.of("sectionKey", "invoice")
        ).orElseThrow();

        assertThat(plan.type()).isEqualTo("CREATE_INVOICE");
        assertThat(plan.executable()).isFalse();
        assertThat(plan.missingFields()).contains("amount", "dueDate (YYYY-MM-DD)");
    }

    @Test
    void usesTillContextForPosCheckoutRegister() {
        CopilotActionPlan plan = service.plan(
            "operations",
            "Complete checkout barcode 12345 qty 2 cash 5000",
            Map.of(
                "sectionKey", "pos",
                "tillSession", Map.of(
                    "registerCode", "POS-01",
                    "isOpen", true
                )
            )
        ).orElseThrow();

        assertThat(plan.type()).isEqualTo("POS_CHECKOUT");
        assertThat(plan.executable()).isTrue();
        assertThat(plan.payload()).containsEntry("posRegisterCode", "POS-01");
    }
}
