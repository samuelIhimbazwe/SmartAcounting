package com.smartaccounting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ThreeWayMatchResult(
    UUID purchaseOrderId,
    UUID supplierBillId,
    BigDecimal poAmount,
    BigDecimal grnAmount,
    BigDecimal billAmount,
    BigDecimal variance,
    BigDecimal variancePercent,
    boolean matched,
    boolean requiresApproval
) {}
