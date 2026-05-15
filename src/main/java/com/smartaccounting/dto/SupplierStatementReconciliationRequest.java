package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SupplierStatementReconciliationRequest(
    @NotEmpty @Valid List<SupplierStatementLineRequest> invoices
) {
}
