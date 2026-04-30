package com.smartchain.copilot;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class EmbeddingService {
    public List<Double> embed(String text) {
        // Deterministic lightweight embedding placeholder until external provider integration.
        List<Double> vec = new ArrayList<>(1536);
        int seed = text == null ? 0 : text.hashCode();
        for (int i = 0; i < 1536; i++) {
            seed = 31 * seed + i;
            vec.add(((seed % 10000) / 10000.0));
        }
        return vec;
    }

    public String toPgVectorLiteral(List<Double> vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(String.format(java.util.Locale.US, "%.6f", vector.get(i)));
        }
        sb.append(']');
        return sb.toString();
    }
}
