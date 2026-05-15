package com.smartaccounting.exception;

import java.math.BigDecimal;

public class CreditLimitExceededException extends RuntimeException {
    private final BigDecimal currentBalance;
    private final BigDecimal creditLimit;
    private final BigDecimal availableCredit;

    public CreditLimitExceededException(BigDecimal currentBalance, BigDecimal creditLimit, BigDecimal availableCredit) {
        super("CREDIT_LIMIT_EXCEEDED");
        this.currentBalance = currentBalance;
        this.creditLimit = creditLimit;
        this.availableCredit = availableCredit;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public BigDecimal getCreditLimit() {
        return creditLimit;
    }

    public BigDecimal getAvailableCredit() {
        return availableCredit;
    }
}
