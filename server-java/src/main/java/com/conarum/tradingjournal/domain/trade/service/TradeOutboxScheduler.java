package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Polls the trade_outbox_events collection and publishes PENDING events to Kafka.
 *
 * Status lifecycle:
 *   PENDING → IN_PROGRESS (batch-marked before async send, prevents re-processing in next poll)
 *           → COMPLETED   (Kafka ack received in callback)
 *           → PENDING     (Kafka send failed, retryCount incremented, back in queue)
 *           → DEAD_LETTER (retryCount >= MAX_RETRIES, needs manual intervention)
 *
 * Stuck recovery: IN_PROGRESS events older than 2 minutes are reset to PENDING
 * to handle app crashes between marking and callback.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TradeOutboxScheduler {

    private static final int MAX_RETRIES = 3;
    private static final int STUCK_THRESHOLD_MINUTES = 2;

    private final TradeOutboxEventRepository tradeOutboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // ── Main poll ──────────────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval:5000}")
    @Transactional
    public void processOutboxEvents() {
        List<TradeOutboxEvent> pendingEvents =
                tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING");

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("Found {} pending trade outbox events. Processing...", pendingEvents.size());

        // Batch-mark IN_PROGRESS before sending — prevents next poll from re-processing
        pendingEvents.forEach(e -> e.setStatus("IN_PROGRESS"));
        tradeOutboxEventRepository.saveAll(pendingEvents);

        // Fire-and-forget sends: no blocking .get(), result handled in callback
        for (TradeOutboxEvent event : pendingEvents) {
            kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload())
                    .whenComplete((result, ex) -> onSendComplete(event, ex));
        }
    }

    // ── Kafka send callback (runs on Kafka sender thread) ─────────────────────

    private void onSendComplete(TradeOutboxEvent event, Throwable ex) {
        if (ex == null) {
            event.setStatus("COMPLETED");
            event.setProcessedAt(Instant.now());
            log.debug("Trade outbox event '{}' COMPLETED", event.getId());
        } else {
            int retries = event.getRetryCount() + 1;
            event.setRetryCount(retries);
            event.setLastRetriedAt(Instant.now());

            if (retries >= MAX_RETRIES) {
                event.setStatus("DEAD_LETTER");
                log.error("Trade outbox event '{}' -> DEAD_LETTER after {} retries. Cause: {}",
                        event.getId(), retries, ex.getMessage());
            } else {
                event.setStatus("PENDING"); // back in queue for next poll
                log.warn("Trade outbox event '{}' send failed, retry {}/{}. Cause: {}",
                        event.getId(), retries, MAX_RETRIES, ex.getMessage());
            }
        }
        tradeOutboxEventRepository.save(event);
    }

    // ── Stuck event recovery ───────────────────────────────────────────────────

    /**
     * Resets IN_PROGRESS events that have been stuck for more than STUCK_THRESHOLD_MINUTES.
     * Handles app crashes between marking IN_PROGRESS and the Kafka callback completing.
     */
    @Scheduled(fixedDelay = 120_000) // every 2 minutes
    @Transactional
    public void recoverStuckEvents() {
        Instant threshold = Instant.now().minusSeconds(STUCK_THRESHOLD_MINUTES * 60L);
        List<TradeOutboxEvent> stuckEvents =
                tradeOutboxEventRepository.findByStatusAndCreatedAtBefore("IN_PROGRESS", threshold);

        if (stuckEvents.isEmpty()) {
            return;
        }

        log.warn("Recovering {} stuck IN_PROGRESS trade outbox events", stuckEvents.size());
        stuckEvents.forEach(e -> e.setStatus("PENDING"));
        tradeOutboxEventRepository.saveAll(stuckEvents);
    }
}
