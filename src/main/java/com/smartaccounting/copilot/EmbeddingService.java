package com.smartaccounting.copilot;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmbeddingService {

    private final String provider;
    private final String apiKey;
    private final String model;
    private final int dimensions;
    private final RestClient restClient = RestClient.create();

    public EmbeddingService(
        @Value("${smartaccounting.ai.embedding.provider:openai}") String provider,
        @Value("${smartaccounting.ai.embedding.api-key:}") String apiKey,
        @Value("${smartaccounting.ai.embedding.model:text-embedding-3-small}") String model,
        @Value("${smartaccounting.ai.embedding.dimensions:1536}") int dimensions
    ) {
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model;
        this.dimensions = dimensions;
    }

    /**
     * Embeddings for pgvector / RAG callers (1536 dimensions for {@code tenant_embeddings}).
     */
    public List<Double> embed(String text) {
        float[] floats = embedAsFloatArray(text);
        List<Double> vec = new ArrayList<>(floats.length);
        for (float f : floats) {
            vec.add((double) f);
        }
        return vec;
    }

    /**
     * Raw embedding vector from OpenAI when {@code provider=openai} and API key is set;
     * otherwise deterministic local vectors (tests / dev without key).
     */
    public float[] embedAsFloatArray(String text) {
        if (useOpenAi()) {
            return openAiEmbed(text);
        }
        return deterministicPlaceholder(text);
    }

    public String toPgVectorLiteral(List<Double> vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(String.format(java.util.Locale.US, "%.6f", vector.get(i)));
        }
        sb.append(']');
        return sb.toString();
    }

    private boolean useOpenAi() {
        return "openai".equalsIgnoreCase(provider) && StringUtils.hasText(apiKey);
    }

    private float[] openAiEmbed(String text) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("input", text == null ? "" : text);
        request.put("model", model);
        request.put("dimensions", dimensions);

        EmbeddingResponse response = restClient.post()
            .uri("https://api.openai.com/v1/embeddings")
            .header("Authorization", "Bearer " + apiKey)
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .body(EmbeddingResponse.class);

        if (response == null || response.data() == null || response.data().isEmpty()) {
            throw new IllegalStateException("OpenAI embeddings response missing data");
        }
        List<Double> values = response.data().get(0).embedding();
        if (values == null || values.isEmpty()) {
            throw new IllegalStateException("OpenAI embeddings response missing embedding vector");
        }
        float[] out = new float[values.size()];
        for (int i = 0; i < values.size(); i++) {
            out[i] = values.get(i).floatValue();
        }
        return out;
    }

    private float[] deterministicPlaceholder(String text) {
        int dim = Math.max(1, dimensions);
        float[] vec = new float[dim];
        int seed = text == null ? 0 : text.hashCode();
        for (int i = 0; i < dim; i++) {
            seed = 31 * seed + i;
            vec[i] = (seed % 10_000) / 10_000.0f;
        }
        return vec;
    }

    private record EmbeddingResponse(List<EmbeddingData> data) {}

    private record EmbeddingData(List<Double> embedding) {}
}
