package com.conarum.userservice.infrastructure.outbox;

import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.infrastructure.metrics.UserServiceMetrics;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.stubbing.Answer;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OutboxScheduler Tests")
class OutboxSchedulerTest {

    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;
    @Mock private UserServiceMetrics userServiceMetrics;

    @InjectMocks private OutboxScheduler outboxScheduler;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        // OutboxScheduler parses payload JSON before sending — needs ObjectMapper
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
        event.setRetryCount(0);
        return event;
    }

    @SuppressWarnings("unchecked")
    private CompletableFuture<SendResult<String, Object>> successFuture() {
        return CompletableFuture.completedFuture(mock(SendResult.class));
    }

    private CompletableFuture<SendResult<String, Object>> failedFuture(String reason) {
        CompletableFuture<SendResult<String, Object>> f = new CompletableFuture<>();
        f.completeExceptionally(new RuntimeException(reason));
        return f;
    }

    @Test
    @DisplayName("processOutboxEvents — batch-marks IN_PROGRESS then sends to Kafka")
    void processOutboxEvents_batchMarksInProgressBeforeSend() {
        String payload = "{\"userEmail\":\"user@example.com\",\"status\":\"SUCCESS\"}";
        OutboxEvent event = buildPendingEvent("evt-001", "billing-events", "txn-001", payload);
        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(event));
        doReturn(successFuture()).when(kafkaTemplate).send(anyString(), anyString(), any());

        // Capture statuses AT TIME of saveAll before async callback mutates them
        List<String> capturedStatuses = new ArrayList<>();
        doAnswer((Answer<Iterable<OutboxEvent>>) inv -> {
            Iterable<OutboxEvent> list = inv.getArgument(0);
            list.forEach(e -> capturedStatuses.add(e.getStatus()));
            return list;
        }).when(outboxEventRepository).saveAll(any());

        outboxScheduler.processOutboxEvents();

        assertThat(capturedStatuses).isNotEmpty().allMatch("IN_PROGRESS"::equals);
    }

    @Test
    @DisplayName("processOutboxEvents — Kafka success marks event COMPLETED")
    void processOutboxEvents_kafkaSuccess_marksCompleted() {
        String payload = "{\"userEmail\":\"user@example.com\",\"status\":\"SUCCESS\"}";
        OutboxEvent event = buildPendingEvent("evt-001", "billing-events", "txn-001", payload);
        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(event));
        doReturn(successFuture()).when(kafkaTemplate).send(anyString(), anyString(), any());

        outboxScheduler.processOutboxEvents();

        verify(kafkaTemplate).send(eq("billing-events"), eq("txn-001"), any());

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("COMPLETED");
        assertThat(captor.getValue().getProcessedAt()).isNotNull();
    }

    @Test
    @DisplayName("processOutboxEvents — empty queue does nothing")
    void processOutboxEvents_noPendingEvents_doesNothing() {
        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of());

        outboxScheduler.processOutboxEvents();

        verifyNoInteractions(kafkaTemplate);
        verify(outboxEventRepository, never()).saveAll(any());
        verify(outboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("processOutboxEvents — Kafka failure increments retry, resets to PENDING")
    void processOutboxEvents_kafkaFailure_incrementsRetryAndResetsToPending() {
        String payload = "{\"key\":\"value\"}";
        OutboxEvent event = buildPendingEvent("evt-002", "billing-events", "txn-002", payload);
        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(event));
        doReturn(failedFuture("Kafka broker down")).when(kafkaTemplate).send(anyString(), anyString(), any());

        outboxScheduler.processOutboxEvents();

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("PENDING");
        assertThat(captor.getValue().getRetryCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("processOutboxEvents — multiple events all sent and COMPLETED")
    void processOutboxEvents_multipleEvents_allCompleted() {
        OutboxEvent e1 = buildPendingEvent("evt-003", "billing-events", "txn-003", "{\"id\":1}");
        OutboxEvent e2 = buildPendingEvent("evt-004", "user-events", "user@example.com", "{\"id\":2}");
        when(outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(e1, e2));
        doReturn(successFuture()).when(kafkaTemplate).send(anyString(), anyString(), any());

        outboxScheduler.processOutboxEvents();

        verify(kafkaTemplate).send(eq("billing-events"), eq("txn-003"), any());
        verify(kafkaTemplate).send(eq("user-events"), eq("user@example.com"), any());
        verify(outboxEventRepository, times(2)).save(any());
    }
}
