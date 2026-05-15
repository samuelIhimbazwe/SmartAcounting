package com.smartaccounting.copilot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartaccounting.tenant.TenantContext;
import org.postgresql.util.PGobject;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CopilotAgentAuditService {
    private static final String GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public CopilotAgentAuditService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void log(UUID runId, String eventType, Object payload) {
        UUID tenantId = requireTenant();
        UUID userId = requireUser();
        String payloadJson = toJson(payload);
        String previousHash;
        try {
            previousHash = jdbcTemplate.query(
                "select record_hash from copilot_agent_audit_log where tenant_id = ? order by created_at desc limit 1",
                (rs, rowNum) -> rs.getString(1),
                tenantId
            ).stream().findFirst().orElse(GENESIS_HASH);
        } catch (Exception ex) {
            ensureAuditTableForH2();
            previousHash = jdbcTemplate.query(
                "select record_hash from copilot_agent_audit_log where tenant_id = ? order by created_at desc limit 1",
                (rs, rowNum) -> rs.getString(1),
                tenantId.toString()
            ).stream().findFirst().orElse(GENESIS_HASH);
        }
        String recordHash = sha256(tenantId + "|" + userId + "|" + runId + "|" + eventType + "|" + payloadJson + "|" + previousHash);
        try {
            jdbcTemplate.update(
                """
                insert into copilot_agent_audit_log
                (id, tenant_id, user_id, run_id, event_type, payload_json, previous_hash, record_hash, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                tenantId,
                userId,
                runId,
                eventType,
                jsonbPayload(payloadJson),
                previousHash,
                recordHash,
                Timestamp.from(Instant.now())
            );
        } catch (Exception ex) {
            ensureAuditTableForH2();
            jdbcTemplate.update(
                """
                insert into copilot_agent_audit_log
                (id, tenant_id, user_id, run_id, event_type, payload_json, previous_hash, record_hash, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                tenantId.toString(),
                userId.toString(),
                runId.toString(),
                eventType,
                payloadJson,
                previousHash,
                recordHash,
                Timestamp.from(Instant.now())
            );
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> byRun(UUID runId) {
        UUID tenantId = requireTenant();
        try {
            return jdbcTemplate.query(
                """
                select event_type, payload_json::text, previous_hash, record_hash, created_at
                from copilot_agent_audit_log
                where tenant_id = ? and run_id = ?
                order by created_at asc
                """,
                (rs, rowNum) -> Map.<String, Object>of(
                    "eventType", rs.getString("event_type"),
                    "payload", parseJson(rs.getString("payload_json")),
                    "previousHash", rs.getString("previous_hash"),
                    "recordHash", rs.getString("record_hash"),
                    "createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant())
                ),
                tenantId, runId
            );
        } catch (Exception ex) {
            return jdbcTemplate.query(
                """
                select event_type, payload_json, previous_hash, record_hash, created_at
                from copilot_agent_audit_log
                where tenant_id = ? and run_id = ?
                order by created_at asc
                """,
                (rs, rowNum) -> Map.<String, Object>of(
                    "eventType", rs.getString("event_type"),
                    "payload", parseJson(rs.getString("payload_json")),
                    "previousHash", rs.getString("previous_hash"),
                    "recordHash", rs.getString("record_hash"),
                    "createdAt", String.valueOf(rs.getTimestamp("created_at").toInstant())
                ),
                tenantId.toString(), runId.toString()
            );
        }
    }

    private UUID requireTenant() {
        if (TenantContext.tenantId() == null) throw new IllegalStateException("Tenant context is required");
        return TenantContext.tenantId();
    }

    private UUID requireUser() {
        if (TenantContext.userId() == null) throw new IllegalStateException("User context is required");
        return TenantContext.userId();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize audit payload", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        try {
            return objectMapper.readValue(json.getBytes(StandardCharsets.UTF_8), Map.class);
        } catch (Exception e) {
            return Map.of("raw", json);
        }
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash copilot agent audit payload", e);
        }
    }

    private static PGobject jsonbPayload(String json) {
        try {
            PGobject o = new PGobject();
            o.setType("jsonb");
            o.setValue(json);
            return o;
        } catch (SQLException e) {
            throw new IllegalStateException("Unable to bind jsonb audit payload", e);
        }
    }

    private void ensureAuditTableForH2() {
        jdbcTemplate.execute("""
            create table if not exists copilot_agent_audit_log (
                id varchar(64) primary key,
                tenant_id varchar(64) not null,
                user_id varchar(64) not null,
                run_id varchar(64) not null,
                event_type varchar(128) not null,
                payload_json varchar(12000),
                previous_hash varchar(128) not null,
                record_hash varchar(128) not null,
                created_at timestamp not null
            )
            """);
    }
}
