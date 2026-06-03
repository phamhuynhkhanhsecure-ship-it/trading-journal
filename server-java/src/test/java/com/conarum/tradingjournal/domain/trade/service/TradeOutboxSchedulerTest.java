package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
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

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TradeOutboxScheduler Tests")
class TradeOutboxSchedulerTest {

    @Mock private TradeOutboxEventRepository tradeOutboxEventRepository;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks private TradeOutboxScheduler tradeOutboxScheduler;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        var field = TradeOutboxScheduler.class.getDeclaredField("objectMapper");
        field.setAccessible(true);
        field.set(tradeOutboxScheduler, objectMapper);
    }

    private TradeOutboxEvent buildPendingEvent(String id, String topic, String aggregateId) {
        TradeOutboxEvent event = TradeOutboxEvent.builder()
                .id(id)
                .topic(topic)
                .aggregateId(aggregateId)
                .eventType("TradeCreatedEvent")
                .payload("{\"tradeId\":\"" + aggregateId + "\"}")
                .status("PENDING")
                .createdAt(Instant.now())
                .build();
        return event;
    }

    @Test
    @DisplayName("processOutboxEvents - should send to Kafka and mark COMPLETED")
    void processOutboxEvents_shouldPublishAndMarkCompleted() throws Exception {
        // Arrange
        TradeOutboxEvent event = buildPendingEvent("evt-001", "trading-events", "trade-001");
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(event));
        var future = CompletableFuture.completedFuture(mock(org.springframework.kafka.support.SendResult.class));
        doReturn(future).when(kafkaTemplate).send(anyString(), anyString(), any());

        // Act
        tradeOutboxScheduler.processOutboxEvents();

        // Assert: Kafka send called with correct topic and key
        verify(kafkaTemplate).send(eq("trading-events"), eq("trade-001"), eq(event.getPayload()));

        // Assert: event saved as COMPLETED
        ArgumentCaptor<TradeOutboxEvent> captor = ArgumentCaptor.forClass(TradeOutboxEvent.class);
        verify(tradeOutboxEventRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("COMPLETED");
        assertThat(captor.getValue().getProcessedAt()).isNotNull();
    }

    @Test
    @DisplayName("processOutboxEvents - empty queue should do nothing")
    void processOutboxEvents_emptyQueue_shouldDoNothing() {
        // Arrange
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of());

        // Act
        tradeOutboxScheduler.processOutboxEvents();

        // Assert
        verifyNoInteractions(kafkaTemplate);
        verify(tradeOutboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("processOutboxEvents - Kafka failure should leave event PENDING for retry")
    void processOutboxEvents_kafkaFailure_shouldLeaveEventPending() throws Exception {
        // Arrange
        TradeOutboxEvent event = buildPendingEvent("evt-002", "trading-events", "trade-002");
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(event));
        CompletableFuture<Object> failedFuture = new CompletableFuture<>();
        failedFuture.completeExceptionally(new RuntimeException("Kafka unavailable"));
        doReturn(failedFuture).when(kafkaTemplate).send(anyString(), anyString(), any());

        // Act
        tradeOutboxScheduler.processOutboxEvents();

        // Assert: NOT saved — stays PENDING
        verify(tradeOutboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("processOutboxEvents - should process multiple events")
    void processOutboxEvents_multipleEvents_processAll() throws Exception {
        // Arrange
        TradeOutboxEvent e1 = buildPendingEvent("evt-003", "trading-events", "trade-003");
        TradeOutboxEvent e2 = buildPendingEvent("evt-004", "trading-events", "trade-004");
        when(tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING")).thenReturn(List.of(e1, e2));
        var future = CompletableFuture.completedFuture(mock(org.springframework.kafka.support.SendResult.class));
        doReturn(future).when(kafkaTemplate).send(anyString(), anyString(), any());

        // Act
        tradeOutboxScheduler.processOutboxEvents();

        // Assert
        verify(kafkaTemplate).send(eq("trading-events"), eq("trade-003"), any());
        verify(kafkaTemplate).send(eq("trading-events"), eq("trade-004"), any());
        verify(tradeOutboxEventRepository, times(2)).save(any());
    }
}
