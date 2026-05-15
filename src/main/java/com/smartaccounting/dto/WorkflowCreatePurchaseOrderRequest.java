package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record WorkflowCreatePurchaseOrderRequest(
    @NotNull UUID supplierId,
    @NotBlank String supplierName,
    LocalDate expectedDeliveryDate,
    String currencyCode,
    String notes,
    @NotEmpty @Valid List<PurchaseOrderLineRequest> lines
) {}
