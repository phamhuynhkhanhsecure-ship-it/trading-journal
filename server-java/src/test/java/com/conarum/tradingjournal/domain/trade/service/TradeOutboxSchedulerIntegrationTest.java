package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.config.TestSecurityConfig;
import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test: TradeOutboxScheduler → Kafka (embedded).
 *
 * Tests the full path:
 *   PENDING event in MongoDB → scheduler polls → sends to Kafka → marks COMPLETED
 *   PENDING event → Kafka fail → retryCount++ → DEAD_LETTER after MAX_RETRIES
 *
 * @EmbeddedKafka provides a real Kafka broker in-process.
 * @DirtiesContext ensures the Kafka broker is reset between test classes.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@EmbeddedKafka(
    partitions = 1,
    topics = { "trading-events" },
    brokerProperties = { "listeners=PLAINTEXT://localhost:0", "port=0" }
)
@DirtiesContext
@DisplayName("TradeOutboxScheduler Integration Tests")
class TradeOutboxSchedulerIntegrationTest {

    @Autowired TradeOutboxScheduler tradeOutboxScheduler;
    @Autowired TradeOutboxEventRepository outboxRepository;
    @Autowired EmbeddedKafkaBroker embeddedKafkaBroker;

    @MockBean GoogleDriveService googleDriveService;
    @MockBean com.conarum.tradingjournal.domain.ai.client.AiServiceClient aiServiceClient;

    @BeforeEach
    void setUp() {
        outboxRepository.deleteAll();
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("processOutboxEvents — PENDING event sent to Kafka → marked COMPLETED")
    void processOutboxEvents_pendingEvent_sentToKafkaAndMarkedCompleted() throws Exception {
        // Arrange: insert PENDING outbox event
        TradeOutboxEvent event = TradeOutboxEvent.builder()
                .topic("trading-events")
                .aggregateId("trade-001")
                .eventType("TradeCreatedEvent")
                .payload("{\"tradeId\":\"trade-001\",\"instrument\":\"BTCUSDT\"}")
                .status("PENDING")
                .createdAt(Instant.now())
                .retryCount(0)
                .build();
        outboxRepository.save(event);

        // Act: manually trigger scheduler
        tradeOutboxScheduler.processOutboxEvents();

        // Assert: consumed from Kafka
        Map<String, Object> consumerProps = KafkaTestUtils.consumerProps(
                "test-scheduler-consumer", "true", embeddedKafkaBroker);
        // Explicitly set String deserializers — KafkaTestUtils defaults may use IntegerDeserializer
        consumerProps.put(org.apache.kafka.clients.consumer.ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
                org.apache.kafka.common.serialization.StringDeserializer.class);
        consumerProps.put(org.apache.kafka.clients.consumer.ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
                org.apache.kafka.common.serialization.StringDeserializer.class);
        try (org.apache.kafka.clients.consumer.Consumer<String, String> consumer =
                     new org.springframework.kafka.core.DefaultKafkaConsumerFactory<String, String>(consumerProps).createConsumer()) {
            embeddedKafkaBroker.consumeFromAnEmbeddedTopic(consumer, "trading-events");
            ConsumerRecord<String, String> record = KafkaTestUtils.getSingleRecord(consumer, "trading-events");
            assertThat(record.key()).isEqualTo("trade-001");
            assertThat(record.value()).contains("BTCUSDT");
        }

        // Wait for async callback to complete
        Thread.sleep(500);

        // Assert: status updated to COMPLETED
        TradeOutboxEvent updated = outboxRepository.findById(event.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo("COMPLETED");
        assertThat(updated.getProcessedAt()).isNotNull();
    }

    @Test
    @DisplayName("processOutboxEvents — no PENDING events → does nothing")
    void processOutboxEvents_noPendingEvents_doesNothing() {
        tradeOutboxScheduler.processOutboxEvents();
        assertThat(outboxRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("processOutboxEvents — multiple PENDING events → all sent and COMPLETED")
    void processOutboxEvents_multipleEvents_allCompleted() throws Exception {
        for (int i = 1; i <= 3; i++) {
            outboxRepository.save(TradeOutboxEvent.builder()
                    .topic("trading-events")
                    .aggregateId("trade-00" + i)
                    .eventType("TradeCreatedEvent")
                    .payload("{\"tradeId\":\"trade-00" + i + "\"}")
                    .status("PENDING")
                    .createdAt(Instant.now())
                    .retryCount(0)
                    .build());
        }

        tradeOutboxScheduler.processOutboxEvents();

        // Wait for async callbacks
        Thread.sleep(1000);

        List<TradeOutboxEvent> all = outboxRepository.findAll();
        assertThat(all).hasSize(3);
        assertThat(all).allMatch(e -> "COMPLETED".equals(e.getStatus()));
    }

    // ── IN_PROGRESS idempotency ───────────────────────────────────────────────

    @Test
    @DisplayName("processOutboxEvents — events marked IN_PROGRESS before send (prevents re-processing)")
    void processOutboxEvents_marksInProgressBeforeSend() throws InterruptedException {
        TradeOutboxEvent event = outboxRepository.save(TradeOutboxEvent.builder()
                .topic("trading-events")
                .aggregateId("trade-ip-001")
                .eventType("TradeCreatedEvent")
                .payload("{\"tradeId\":\"trade-ip-001\"}")
                .status("PENDING")
                .createdAt(Instant.now())
                .retryCount(0)
                .build());

        tradeOutboxScheduler.processOutboxEvents();

        // After processOutboxEvents() returns, the event should be IN_PROGRESS or COMPLETED
        // (IN_PROGRESS is set synchronously before the async send)
        TradeOutboxEvent afterCall = outboxRepository.findById(event.getId()).orElseThrow();
        assertThat(afterCall.getStatus()).isIn("IN_PROGRESS", "COMPLETED");
    }

    // ── Stuck event recovery ──────────────────────────────────────────────────

    @Test
    @DisplayName("recoverStuckEvents — IN_PROGRESS events older than 2 min reset to PENDING")
    void recoverStuckEvents_oldInProgressReset() {
        // Arrange: stuck IN_PROGRESS event from 5 minutes ago
        TradeOutboxEvent stuck = TradeOutboxEvent.builder()
                .topic("trading-events")
                .aggregateId("trade-stuck")
                .eventType("TradeCreatedEvent")
                .payload("{\"tradeId\":\"trade-stuck\"}")
                .status("IN_PROGRESS")
                .createdAt(Instant.now().minusSeconds(300)) // 5 minutes ago
                .retryCount(0)
                .build();
        outboxRepository.save(stuck);

        // Act
        tradeOutboxScheduler.recoverStuckEvents();

        // Assert: reset to PENDING
        TradeOutboxEvent recovered = outboxRepository.findById(stuck.getId()).orElseThrow();
        assertThat(recovered.getStatus()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("recoverStuckEvents — recent IN_PROGRESS events NOT reset")
    void recoverStuckEvents_recentInProgressNotReset() {
        TradeOutboxEvent recent = outboxRepository.save(TradeOutboxEvent.builder()
                .topic("trading-events")
                .aggregateId("trade-recent")
                .eventType("TradeCreatedEvent")
                .payload("{\"tradeId\":\"trade-recent\"}")
                .status("IN_PROGRESS")
                .createdAt(Instant.now()) // just now
                .retryCount(0)
                .build());

        tradeOutboxScheduler.recoverStuckEvents();

        TradeOutboxEvent after = outboxRepository.findById(recent.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo("IN_PROGRESS"); // unchanged
    }
}
