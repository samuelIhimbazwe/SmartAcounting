package com.smartaccounting.integration;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.Tag;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Embedded PostgreSQL (Zonky) + Flyway for full {@code @SpringBootTest} integration tests.
 * No Docker required; matches production PostgreSQL behaviour without H2 gaps.
 */
@Tag("integration")
@ActiveProfiles("it")
public abstract class AbstractPostgresSpringBootIntegrationTest {

    private static final AtomicReference<EmbeddedPostgres> EMBEDDED = new AtomicReference<>();

    private static EmbeddedPostgres embedded() {
        return EMBEDDED.updateAndGet(existing -> {
            if (existing != null) {
                return existing;
            }
            try {
                return EmbeddedPostgres.start();
            } catch (IOException e) {
                throw new IllegalStateException("Failed to start embedded PostgreSQL", e);
            }
        });
    }

    static {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            EmbeddedPostgres pg = EMBEDDED.getAndSet(null);
            if (pg != null) {
                try {
                    pg.close();
                } catch (IOException ignored) {
                    // best-effort shutdown
                }
            }
        }));
    }

    @DynamicPropertySource
    static void dataSourceProperties(DynamicPropertyRegistry registry) {
        EmbeddedPostgres pg = embedded();
        registry.add("spring.datasource.url", () -> pg.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }
}
