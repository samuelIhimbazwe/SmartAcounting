package com.smartaccounting.service;

import com.smartaccounting.compliance.rwanda.RwandaComplianceProperties;
import com.smartaccounting.compliance.rwanda.RwandaVatMath;
import com.smartaccounting.dto.VatAmountResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

@Service
public class PosVatService {
    private final RwandaComplianceProperties properties;

    public PosVatService(RwandaComplianceProperties properties) {
        this.properties = properties;
    }

    public VatAmountResult calculateVat(BigDecimal grossAmount) {
        Map<String, BigDecimal> split = RwandaVatMath.splitLineAmount(
            grossAmount, true, properties.getVatRatePercent());
        return new VatAmountResult(split.get("vat"), split.get("net"), split.get("gross"));
    }
}
