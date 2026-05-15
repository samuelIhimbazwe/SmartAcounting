package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PosCheckoutRequest(
    String customerName,
    @NotBlank String currencyCode,
    String posRegisterCode,
    @NotEmpty @Valid List<PosCheckoutLineRequest> lines,
    @NotEmpty @Valid List<PosTenderRequest> tenders,
    /** Required when any tender uses ON_ACCOUNT: name of the customer to bill. */
    String onAccountCustomerName,
    Boolean managerOverride,
    /** Optional cashier display name for sales analytics. */
    String cashierName,
    /** Lines that could not be fulfilled due to stock-out (lost sales tracking). */
    java.util.List<PosOutOfStockAttemptRequest> outOfStockAttempts
) {}
