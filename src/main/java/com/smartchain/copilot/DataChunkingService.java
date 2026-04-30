package com.smartchain.copilot;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DataChunkingService {
    private final JdbcTemplate jdbcTemplate;

    public DataChunkingService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Chunk> buildChunks(UUID tenantId) {
        List<Chunk> all = new ArrayList<>();
        all.addAll(jdbcTemplate.query("""
            select id, customer_name, amount, currency_code, due_date, status
            from invoices where tenant_id = ? order by created_at desc limit 500
            """,
            (rs, rowNum) -> new Chunk(
                "invoices",
                UUID.fromString(rs.getString("id")),
                "Invoice to " + rs.getString("customer_name") + " for " + rs.getBigDecimal("amount") +
                    " " + rs.getString("currency_code") + " due " + rs.getDate("due_date") + " status " + rs.getString("status")
            ), tenantId));
        all.addAll(jdbcTemplate.query("""
            select id, counterparty, amount, currency_code, direction, status
            from payments where tenant_id = ? order by created_at desc limit 500
            """,
            (rs, rowNum) -> new Chunk(
                "payments",
                UUID.fromString(rs.getString("id")),
                "Payment " + rs.getString("direction") + " " + rs.getBigDecimal("amount") + " " +
                    rs.getString("currency_code") + " counterparty " + rs.getString("counterparty") + " status " + rs.getString("status")
            ), tenantId));
        return all;
    }

    public record Chunk(String entityType, UUID entityId, String content) {}
}
