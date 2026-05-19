package com.smartaccounting.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

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
    java.util.List<PosOutOfStockAttemptRequest> outOfStockAttempts,
    /** Linked finance customer for price list, loyalty, and ON_ACCOUNT. */
    java.util.UUID customerId,
    /** Points to redeem on this sale (deducted before total). */
    Integer loyaltyPointsRedeemed,
    /** NORMAL or LAYAWAY (layaway uses separate flow when not NORMAL). */
    String saleType
) {}
