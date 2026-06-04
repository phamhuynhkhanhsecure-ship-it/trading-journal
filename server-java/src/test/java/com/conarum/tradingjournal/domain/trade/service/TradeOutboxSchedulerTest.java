package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.common.metrics.TradingMetrics;
import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.stubbing.Answer;

import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for TradeOutboxScheduler.
 *
 * The scheduler now uses async sends (whenComplete callback) with an IN_PROGRESS
 * status set before sending. When mocked futures complete immediately (synchronously),
 * the callback also runs synchronously, so no Thread.sleep needed.
 *
 * New flow:
 *   1. saveAll(IN_PROGRESS) — synchronous, prevents re-processing
 *   2. kafkaTemplate.send().whenComplete(callback) — async, but mocked = synchronous
 *   3. callback: save(COMPLETED) OR save(PENDING/DEAD_LETTER on failure)
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TradeOutboxScheduler Tests")
class TradeOutboxSchedulerTest {

    @Mock private TradeOutboxEventRepository tradeOutboxEventRepository;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;
    @Mock private TradingMetrics tradingMetrics;

    @InjectMocks private TradeOutboxScheduler tradeOutboxScheduler;

    private TradeOutboxEvent buildPendingEvent(String id, String topic, String aggregateId) {
        return TradeOutboxEvent.builder()
                .id(id).topic(topic).aggregateId(aggregateId)
                .eventType("TradeCreatedEvent")
                .payload("{\"tradeId\":\"" + aggregateId + "\"}")
                .status("PENDING").createdAt(Instant.now()).retryCount(0)
                .build();
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

    // ── Happy path ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("processOutboxEvents — batch-marks IN_PROGRESS then sends to Kafka")
    void processOutboxEvents_batchMarksInProgressThenSends() {
        TradeOutboxEvent event = buildPendingEvent("evt-001", "trading-events", "trade-001");
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(List.of(event));
        doReturn(successFuture()).when(kafkaTemplate).send(anyString(), anyString(), any());

        // Capture statuses AT THE TIME of saveAll (before async callback mutates the objects)
        List<String> capturedStatuses = new ArrayList<>();
        doAnswer((Answer<Iterable<TradeOutboxEvent>>) inv -> {
            Iterable<TradeOutboxEvent> list = inv.getArgument(0);
            list.forEach(e -> capturedStatuses.add(e.getStatus()));
            return list;
        }).when(tradeOutboxEventRepository).saveAll(any());

        tradeOutboxScheduler.processOutboxEvents();

        // Step 1: saveAll was called and all events were IN_PROGRESS at that point
        assertThat(capturedStatuses).isNotEmpty().allMatch("IN_PROGRESS"::equals);

        // Step 2: Kafka send
        verify(kafkaTemplate).send(eq("trading-events"), eq("trade-001"), eq(event.getPayload()));
    }

    @Test
    @DisplayName("processOutboxEvents — Kafka success callback marks event COMPLETED")
    void processOutboxEvents_successCallback_marksCompleted() {
        TradeOutboxEvent event = buildPendingEvent("evt-001", "trading-events", "trade-001");
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(List.of(event));
        // CompletableFuture.completedFuture → whenComplete runs synchronously
        doReturn(successFuture()).when(kafkaTemplate).send(anyString(), anyString(), any());

        tradeOutboxScheduler.processOutboxEvents();

        // Step 3: callback save with COMPLETED
        ArgumentCaptor<TradeOutboxEvent> saveCaptor = ArgumentCaptor.forClass(TradeOutboxEvent.class);
        verify(tradeOutboxEventRepository).save(saveCaptor.capture());
        assertThat(saveCaptor.getValue().getStatus()).isEqualTo("COMPLETED");
        assertThat(saveCaptor.getValue().getProcessedAt()).isNotNull();
    }

    @Test
    @DisplayName("processOutboxEvents — empty queue does nothing")
    void processOutboxEvents_emptyQueue_doesNothing() {
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(List.of());

        tradeOutboxScheduler.processOutboxEvents();

        verifyNoInteractions(kafkaTemplate);
        verify(tradeOutboxEventRepository, never()).saveAll(any());
        verify(tradeOutboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("processOutboxEvents — Kafka failure increments retryCount, resets to PENDING")
    void processOutboxEvents_kafkaFailure_incrementsRetryAndResetsToPending() {
        TradeOutboxEvent event = buildPendingEvent("evt-002", "trading-events", "trade-002");
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(List.of(event));
        doReturn(failedFuture("Kafka broker down")).when(kafkaTemplate).send(anyString(), anyString(), any());

        tradeOutboxScheduler.processOutboxEvents();

        ArgumentCaptor<TradeOutboxEvent> captor = ArgumentCaptor.forClass(TradeOutboxEvent.class);
        verify(tradeOutboxEventRepository).save(captor.capture());
        TradeOutboxEvent saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo("PENDING");  // back in queue, retry < MAX_RETRIES
        assertThat(saved.getRetryCount()).isEqualTo(1);
        assertThat(saved.getLastRetriedAt()).isNotNull();
    }

    @Test
    @DisplayName("processOutboxEvents — event moves to DEAD_LETTER after MAX_RETRIES")
    void processOutboxEvents_maxRetriesExceeded_movesToDeadLetter() {
        TradeOutboxEvent event = buildPendingEvent("evt-003", "trading-events", "trade-003");
        event.setRetryCount(2); // already at MAX_RETRIES - 1
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(List.of(event));
        doReturn(failedFuture("Broker unavailable")).when(kafkaTemplate).send(anyString(), anyString(), any());

        tradeOutboxScheduler.processOutboxEvents();

        ArgumentCaptor<TradeOutboxEvent> captor = ArgumentCaptor.forClass(TradeOutboxEvent.class);
        verify(tradeOutboxEventRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("DEAD_LETTER");
        assertThat(captor.getValue().getRetryCount()).isEqualTo(3);
        verify(tradingMetrics).recordOutboxDeadLetter();
    }

    @Test
    @DisplayName("processOutboxEvents — multiple events: all sent and all saved")
    void processOutboxEvents_multipleEvents_allProcessed() {
        TradeOutboxEvent e1 = buildPendingEvent("evt-003", "trading-events", "trade-003");
        TradeOutboxEvent e2 = buildPendingEvent("evt-004", "trading-events", "trade-004");
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING"))
                .thenReturn(List.of(e1, e2));
        doReturn(successFuture()).when(kafkaTemplate).send(anyString(), anyString(), any());

        tradeOutboxScheduler.processOutboxEvents();

        verify(kafkaTemplate).send(eq("trading-events"), eq("trade-003"), any());
        verify(kafkaTemplate).send(eq("trading-events"), eq("trade-004"), any());
        verify(tradeOutboxEventRepository, times(2)).save(any());
    }
}
