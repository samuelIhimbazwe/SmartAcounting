package com.smartaccounting.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Mobile may send {@code supplier} inline (no supplier_id).
 * Web/back-office flows may still send {@code supplierId} + {@code supplierName}.
 */
public record WorkflowCreatePurchaseOrderRequest(
    UUID supplierId,
    String supplierName,
  @Valid InlineSupplierRequest supplier,
    @JsonProperty("supplier_local_id") String supplierLocalId,
    LocalDate expectedDeliveryDate,
    String currencyCode,
    String notes,
    @NotEmpty @Valid List<PurchaseOrderLineRequest> lines
) {}
