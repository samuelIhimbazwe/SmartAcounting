package com.smartchain.copilot;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class RagIngestionService {
    private final JdbcTemplate jdbcTemplate;
    private final DataChunkingService dataChunkingService;
    private final EmbeddingService embeddingService;

    public RagIngestionService(JdbcTemplate jdbcTemplate,
                               DataChunkingService dataChunkingService,
                               EmbeddingService embeddingService) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataChunkingService = dataChunkingService;
        this.embeddingService = embeddingService;
    }

    @Scheduled(cron = "0 2 * * *")
    @Transactional
    public void nightlyReindex() {
        List<UUID> tenants = jdbcTemplate.query("select distinct tenant_id from event_log",
            (rs, rowNum) -> UUID.fromString(rs.getString(1)));
        for (UUID tenant : tenants) {
            reindexTenant(tenant);
        }
    }

    @Transactional
    public int reindexTenant(UUID tenantId) {
        int count = 0;
        for (DataChunkingService.Chunk chunk : dataChunkingService.buildChunks(tenantId)) {
            String vec = embeddingService.toPgVectorLiteral(embeddingService.embed(chunk.content()));
            jdbcTemplate.update("""
                INSERT INTO tenant_embeddings (id, tenant_id, entity_type, entity_id, content, embedding, created_at)
                VALUES (?, ?, ?, ?, ?, CAST(? AS vector), now())
                ON CONFLICT (tenant_id, entity_type, entity_id)
                DO UPDATE SET content = excluded.content, embedding = excluded.embedding, created_at = now()
                """,
                UUID.randomUUID(), tenantId, chunk.entityType(), chunk.entityId(), chunk.content(), vec);
            count++;
        }
        return count;
    }
}
