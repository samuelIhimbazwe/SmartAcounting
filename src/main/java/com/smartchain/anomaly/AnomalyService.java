package com.smartchain.anomaly;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AnomalyService {

    public Map<String, Object> explain(String id) {
        return Map.of(
            "anomalyId", id,
            "severity", "HIGH",
            "explanation", "This transaction deviates by 3.4 standard deviations from the rolling 90-day baseline.",
            "likelyCauses", "Late-period manual adjustment and unusual account pairing."
        );
    }
}
