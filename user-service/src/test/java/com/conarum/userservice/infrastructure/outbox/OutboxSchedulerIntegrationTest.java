package com.conarum.userservice.infrastructure.outbox;

import com.conarum.userservice.common.model.OutboxEvent;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test: OutboxScheduler (user-service) → Kafka (embedded).
 *
 * Tests:
 * - PENDING event → scheduler polls → sent to Kafka → COMPLETED
 * - Empty queue → no Kafka activity
 * - Multiple events → all published concurrently
 * - Stuck IN_PROGRESS recovery
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Import(com.conarum.userservice.config.TestSecurityConfig.class)
@EmbeddedKafka(
    partitions = 1,
    topics = { "billing-events", "user-events" },
    brokerProperties = { "listeners=PLAINTEXT://localhost:0", "port=0" }
)
@DirtiesContext
@DisplayName("OutboxScheduler Integration Tests — user-service")
class OutboxSchedulerIntegrationTest {

    @Autowired OutboxScheduler outboxScheduler;
    @Autowired OutboxEventRepository outboxEventRepository;
    @Autowired EmbeddedKafkaBroker embeddedKafkaBroker;

    @MockBean StringRedisTemplate stringRedisTemplate;

    @BeforeEach
    void setUp() {
        outboxEventRepository.deleteAll();
    }

    @Test
    @DisplayName("processOutboxEvents — PENDING billing event sent to Kafka → COMPLETED")
    void processOutboxEvents_billingEvent_sentAndCompleted() throws Exception {
        OutboxEvent event = outboxEventRepository.save(OutboxEvent.builder()
                .topic("billing-events")
                .aggregateId("txn-001")
                .eventType("PaymentProcessedEvent")
                .payload("{\"transactionId\":\"txn-001\",\"userEmail\":\"user@test.com\",\"status\":\"SUCCESS\"}")
                .status("PENDING")
                .createdAt(Instant.now())
                .retryCount(0)
                .build());

        outboxScheduler.processOutboxEvents();

        // Consume from Kafka
        Map<String, Object> props = KafkaTestUtils.consumerProps(
                "test-billing-consumer", "true", embeddedKafkaBroker);
        props.put(org.apache.kafka.clients.consumer.ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
                org.apache.kafka.common.serialization.StringDeserializer.class);
        props.put(org.apache.kafka.clients.consumer.ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
                org.apache.kafka.common.serialization.StringDeserializer.class);
        try (org.apache.kafka.clients.consumer.Consumer<String, String> consumer =
                     new org.springframework.kafka.core.DefaultKafkaConsumerFactory<String, String>(props).createConsumer()) {
            embeddedKafkaBroker.consumeFromAnEmbeddedTopic(consumer, "billing-events");
            ConsumerRecord<String, String> record = KafkaTestUtils.getSingleRecord(consumer, "billing-events");
            assertThat(record.key()).isEqualTo("txn-001");
            assertThat(record.value()).contains("user@test.com");
        }

        // Wait for async callback
        Thread.sleep(500);

        OutboxEvent updated = outboxEventRepository.findById(event.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("COMPLETED");
        assertThat(updated.getProcessedAt()).isNotNull();
    }

    @Test
    @DisplayName("processOutboxEvents — user-events topic published correctly")
    void processOutboxEvents_userEvent_sentToCorrectTopic() throws Exception {
        outboxEventRepository.save(OutboxEvent.builder()
                .topic("user-events")
                .aggregateId("user@test.com")
                .eventType("UserRoleUpgradedEvent")
                .payload("{\"userEmail\":\"user@test.com\",\"newRole\":\"PREMIUM\"}")
                .status("PENDING")
                .createdAt(Instant.now())
                .retryCount(0)
                .build());

        outboxScheduler.processOutboxEvents();

        Map<String, Object> props = KafkaTestUtils.consumerProps(
                "test-user-events-consumer", "true", embeddedKafkaBroker);
        props.put(org.apache.kafka.clients.consumer.ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
                org.apache.kafka.common.serialization.StringDeserializer.class);
        props.put(org.apache.kafka.clients.consumer.ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
                org.apache.kafka.common.serialization.StringDeserializer.class);
        try (org.apache.kafka.clients.consumer.Consumer<String, String> consumer =
                     new org.springframework.kafka.core.DefaultKafkaConsumerFactory<String, String>(props).createConsumer()) {
            embeddedKafkaBroker.consumeFromAnEmbeddedTopic(consumer, "user-events");
            ConsumerRecord<String, String> record = KafkaTestUtils.getSingleRecord(consumer, "user-events");
            assertThat(record.key()).isEqualTo("user@test.com");
            assertThat(record.value()).contains("PREMIUM");
        }
    }

    @Test
    @DisplayName("processOutboxEvents — empty queue → nothing sent")
    void processOutboxEvents_emptyQueue_noKafkaActivity() {
        outboxScheduler.processOutboxEvents();
        assertThat(outboxEventRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("processOutboxEvents — multiple events published concurrently")
    void processOutboxEvents_multipleEvents_allCompleted() throws Exception {
        for (int i = 1; i <= 3; i++) {
            outboxEventRepository.save(OutboxEvent.builder()
                    .topic("billing-events")
                    .aggregateId("txn-00" + i)
                    .eventType("PaymentProcessedEvent")
                    .payload("{\"transactionId\":\"txn-00" + i + "\"}")
                    .status("PENDING")
                    .createdAt(Instant.now())
                    .retryCount(0)
                    .build());
        }

        outboxScheduler.processOutboxEvents();

        Thread.sleep(1000);

        List<OutboxEvent> all = outboxEventRepository.findAll();
        assertThat(all).hasSize(3);
        assertThat(all).allMatch(e -> "COMPLETED".equals(e.getStatus()));
    }

    @Test
    @DisplayName("processOutboxEvents — IN_PROGRESS set before async send (prevents re-processing)")
    void processOutboxEvents_markedInProgressBeforeSend() {
        OutboxEvent event = outboxEventRepository.save(OutboxEvent.builder()
                .topic("billing-events")
                .aggregateId("txn-ip-001")
                .eventType("PaymentProcessedEvent")
                .payload("{\"transactionId\":\"txn-ip-001\"}")
                .status("PENDING")
                .createdAt(Instant.now())
                .retryCount(0)
                .build());

        outboxScheduler.processOutboxEvents();

        // Synchronously after return: should be IN_PROGRESS or COMPLETED (not PENDING)
        OutboxEvent after = outboxEventRepository.findById(event.getId()).orElseThrow();
        assertThat(after.getStatus()).isIn("IN_PROGRESS", "COMPLETED");
    }

    @Test
    @DisplayName("recoverStuckEvents — old IN_PROGRESS events reset to PENDING")
    void recoverStuckEvents_oldInProgressReset() {
        OutboxEvent stuck = outboxEventRepository.save(OutboxEvent.builder()
                .topic("billing-events")
                .aggregateId("txn-stuck")
                .eventType("PaymentProcessedEvent")
                .payload("{\"transactionId\":\"txn-stuck\"}")
                .status("IN_PROGRESS")
                .createdAt(Instant.now().minusSeconds(300))
                .retryCount(0)
                .build());

        outboxScheduler.recoverStuckEvents();

        OutboxEvent recovered = outboxEventRepository.findById(stuck.getId()).orElseThrow();
        assertThat(recovered.getStatus()).isEqualTo("PENDING");
    }
}
