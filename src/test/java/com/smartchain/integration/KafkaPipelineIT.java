package com.smartchain.integration;

import com.smartchain.events.DomainEventPublisher;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "smartchain.kafka.enabled=true",
    "smartchain.kafka.topic-domain-events=domain.events",
    "smartchain.kafka.topic-dlq-events=domain.events.dlq"
})
@Testcontainers
class KafkaPipelineIT {

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

    @DynamicPropertySource
    static void kafkaProps(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private DomainEventPublisher publisher;

    @Test
    void kafkaPublisherSendsTenantKeyedEvent() {
        publisher.publish("domain.events", "TEST_EVENT", Map.of(
            "tenantId", "11111111-1111-1111-1111-111111111111",
            "value", 42
        ));

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers());
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "smartchain-kafka-it");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class.getName());

        try (KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props)) {
            consumer.subscribe(List.of("domain.events"));
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(10));
            boolean found = false;
            for (ConsumerRecord<String, String> record : records) {
                if ("11111111-1111-1111-1111-111111111111".equals(record.key())
                    && record.value().contains("\"eventType\":\"TEST_EVENT\"")) {
                    found = true;
                }
            }
            assertTrue(found, "Expected tenant-keyed event in Kafka topic");
        }
    }
}
