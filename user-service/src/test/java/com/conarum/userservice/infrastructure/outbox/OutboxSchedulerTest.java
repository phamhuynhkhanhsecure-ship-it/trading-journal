package com.conarum.userservice.infrastructure.outbox;

import com.conarum.userservice.common.model.OutboxEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.util.concurrent.SettableListenableFuture;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OutboxScheduler Tests")
class OutboxSchedulerTest {

    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks private OutboxScheduler outboxScheduler;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        var field = OutboxScheduler.class.getDeclaredField("objectMapper");
        field.setAccessible(true);
        field.set(outboxScheduler, objectMapper);
    }

    private OutboxEvent buildPendingEvent(String id, String topic, String aggregateId, String payload) {
        OutboxEvent event = new OutboxEvent();
        event.setId(id);
        event.setTopic(topic);
        event.setAggregateId(aggregateId);
        event.setPayload(payload);
        event.setStatus("PENDING");
        event.setCreatedAt(Instant.now());
        return event;
    }

    @Test
    @DisplayName("processOutboxEvents - should send to Kafka and mark COMPLETED")
    void processOutboxEvents_shouldPublishAndMarkCompleted() throws Exception {
        // Arrange
        String payload = "{\"userEmail\":\"user@example.com\",\"status\":\"SUCCESS\"}";
        OutboxEvent event = buildPendingEvent("evt-001", "billing-events", "txn-001", payload);

        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(event));
        var future = CompletableFuture.completedFuture(mock(org.springframework.kafka.support.SendResult.class));
        doReturn(future).when(kafkaTemplate).send(anyString(), anyString(), any());

        // Act
        outboxScheduler.processOutboxEvents();

        // Assert: Kafka send called
        verify(kafkaTemplate).send(eq("billing-events"), eq("txn-001"), any());

        // Assert: event marked COMPLETED
        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("COMPLETED");
        assertThat(captor.getValue().getProcessedAt()).isNotNull();
    }

    @Test
    @DisplayName("processOutboxEvents - should skip when no pending events")
    void processOutboxEvents_noPendingEvents_shouldDoNothing() {
        // Arrange
        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of());

        // Act
        outboxScheduler.processOutboxEvents();

        // Assert
        verifyNoInteractions(kafkaTemplate);
        verify(outboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("processOutboxEvents - should leave PENDING if Kafka fails")
    void processOutboxEvents_kafkaFails_shouldNotMarkCompleted() throws Exception {
        // Arrange
        String payload = "{\"key\":\"value\"}";
        OutboxEvent event = buildPendingEvent("evt-002", "billing-events", "txn-002", payload);

        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(event));
        var failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new RuntimeException("Kafka broker down"));
        doReturn(failedFuture).when(kafkaTemplate).send(anyString(), anyString(), any());

        // Act
        outboxScheduler.processOutboxEvents();

        // Assert: event NOT saved as COMPLETED (exception swallowed, stays PENDING for retry)
        verify(outboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("processOutboxEvents - should process multiple events in order")
    void processOutboxEvents_multipleEvents_shouldProcessAll() throws Exception {
        // Arrange
        String payload1 = "{\"id\":1}";
        String payload2 = "{\"id\":2}";
        OutboxEvent event1 = buildPendingEvent("evt-003", "billing-events", "txn-003", payload1);
        OutboxEvent event2 = buildPendingEvent("evt-004", "user-events", "user@example.com", payload2);

        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(event1, event2));
        var future = CompletableFuture.completedFuture(mock(org.springframework.kafka.support.SendResult.class));
        doReturn(future).when(kafkaTemplate).send(anyString(), anyString(), any());

        // Act
        outboxScheduler.processOutboxEvents();

        // Assert: both sent to Kafka
        verify(kafkaTemplate).send(eq("billing-events"), eq("txn-003"), any());
        verify(kafkaTemplate).send(eq("user-events"), eq("user@example.com"), any());

        // Assert: both saved as COMPLETED
        verify(outboxEventRepository, times(2)).save(any());
    }
}
