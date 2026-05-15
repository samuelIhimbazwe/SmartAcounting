package com.smartaccounting.controller;

import com.smartaccounting.dto.SupplierStatementLineRequest;
import com.smartaccounting.dto.SupplierStatementReconciliationRequest;
import com.smartaccounting.service.ReceivablesPayablesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReceivablesPayablesControllerTest {
    @Mock
    private ReceivablesPayablesService service;

    @InjectMocks
    private ReceivablesPayablesController controller;

    @Test
    void writeOffInvoiceBadDebtDelegatesToService() {
        UUID invoiceId = UUID.fromString("50000000-0000-0000-0000-000000000555");
        Map<String, Object> expected = Map.of(
            "invoiceId", invoiceId,
            "status", "BAD_DEBT",
            "archived", true
        );
        when(service.writeOffInvoiceBadDebt(invoiceId)).thenReturn(expected);

        Map<String, Object> out = controller.writeOffInvoiceBadDebt(invoiceId);

        assertThat(out).isEqualTo(expected);
        verify(service).writeOffInvoiceBadDebt(invoiceId);
    }

    @Test
    void reconcileSupplierStatementDelegatesToService() {
        UUID supplierId = UUID.fromString("91000000-0000-0000-0000-000000000001");
        SupplierStatementReconciliationRequest request = new SupplierStatementReconciliationRequest(List.of(
            new SupplierStatementLineRequest("REF-1", java.math.BigDecimal.TEN)
        ));
        Map<String, Object> expected = Map.of(
            "matched", List.of(),
            "systemOnly", List.of(),
            "statementOnly", List.of(),
            "balanceDifference", java.math.BigDecimal.ZERO
        );
        when(service.reconcileSupplierStatement(supplierId, request)).thenReturn(expected);

        Map<String, Object> out = controller.reconcileSupplierStatement(supplierId, request);

        assertThat(out).isEqualTo(expected);
        verify(service).reconcileSupplierStatement(supplierId, request);
    }
}
