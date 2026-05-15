package com.smartaccounting.compliance.rwanda;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Domestic VAT: 18% (standard). Amount interpretation is controlled by tenant RRA settings
 * (tax-inclusive vs tax-exclusive line amounts).
 */
public final class RwandaVatMath {
    private RwandaVatMath() {
    }

    public static Map<String, BigDecimal> splitLineAmount(BigDecimal amount, boolean taxInclusive, BigDecimal vatRatePercent) {
        if (amount == null) {
            amount = BigDecimal.ZERO;
        }
        BigDecimal rate = vatRatePercent == null
            ? new BigDecimal("18")
            : vatRatePercent;
        BigDecimal divisor = BigDecimal.ONE.add(rate.divide(BigDecimal.valueOf(100), 8, RoundingMode.HALF_UP));
        if (taxInclusive) {
            BigDecimal net = amount.divide(divisor, 4, RoundingMode.HALF_UP);
            BigDecimal vat = amount.subtract(net).setScale(4, RoundingMode.HALF_UP);
            return Map.of("net", net, "vat", vat, "gross", amount);
        }
        BigDecimal vat = amount.multiply(rate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal gross = amount.add(vat);
        return Map.of("net", amount, "vat", vat, "gross", gross);
    }
}
