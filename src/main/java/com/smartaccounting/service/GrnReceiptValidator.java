package com.smartaccounting.service;

import com.smartaccounting.exception.BusinessException;

import java.time.LocalDate;

final class GrnReceiptValidator {
    private GrnReceiptValidator() {}

    static void assertExpiryAcceptable(LocalDate expiryDate, boolean allowExpiredReceipt) {
        if (expiryDate == null) {
            return;
        }
        if (!allowExpiredReceipt && expiryDate.isBefore(LocalDate.now())) {
            throw new BusinessException(
                "Cannot receive stock with expiry date " + expiryDate
                    + " in the past. Set allowExpiredReceipt=true to override.");
        }
    }
}
