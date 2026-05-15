package com.smartaccounting.dto;

import java.math.BigDecimal;

public record PayrollDeductions(
    BigDecimal rssbEmployee,
    BigDecimal rssbEmployer,
    BigDecimal maternityInsurance,
    BigDecimal cbhi,
    BigDecimal taxableIncome,
    BigDecimal paye,
    BigDecimal netPay
) {}
