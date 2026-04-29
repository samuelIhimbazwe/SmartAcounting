package com.smartchain.integration;

import com.smartchain.events.DomainEventPublisher;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "smartchain.kafka.enabled=true",
    "smartchain.kafka.topic-domain-events=domain.events"
})
@Testcontainers
class KafkaPipelineIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

    @DynamicPropertySource
    static void kafkaProps(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private DomainEventPublisher publisher;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void inventoryEventUpdatesOpsProjectionUnderThreeSeconds() throws Exception {
        UUID tenant = UUID.randomUUID();
        jdbcTemplate.execute("create table if not exists purchase_orders (tenant_id varchar(64), total_amount decimal(20,4), supplier_name varchar(200))");
        jdbcTemplate.execute("create table if not exists ops_kpi_snapshot (tenant_id varchar(64), snapshot_date date, payload varchar(4000))");
        jdbcTemplate.update("insert into purchase_orders(tenant_id,total_amount,supplier_name) values (?,?,?)",
            tenant.toString(), 100.00, "Supplier A");

        Instant start = Instant.now();
        publisher.publish("domain.inventory.events", "STOCK_MOVED", Map.of(
            "tenantId", tenant.toString(),
            "productId", UUID.randomUUID().toString(),
            "fromLocationId", "A",
            "toLocationId", "B",
            "quantity", 5
        ));

        boolean found = false;
        Instant timeout = Instant.now().plusSeconds(3);
        while (Instant.now().isBefore(timeout)) {
            Integer c = jdbcTemplate.queryForObject(
                "select count(*) from ops_kpi_snapshot where tenant_id = ?",
                Integer.class,
                tenant.toString()
            );
            if (c != null && c > 0) {
                found = true;
                break;
            }
            Thread.sleep(200);
        }
        assertTrue(found, "Expected ops projection row within 3s");
        assertTrue(Duration.between(start, Instant.now()).toMillis() < 3000);
        String payload = jdbcTemplate.queryForObject(
            "select payload from ops_kpi_snapshot where tenant_id = ?",
            String.class,
            tenant.toString()
        );
        assertNotNull(payload);
    }
}
