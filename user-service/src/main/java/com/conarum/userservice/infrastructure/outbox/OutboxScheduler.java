package com.conarum.userservice.infrastructure.outbox;

import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.infrastructure.metrics.UserServiceMetrics;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Polls the outbox_events collection and publishes PENDING events to Kafka.
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
public class OutboxScheduler {

    private static final int MAX_RETRIES = 3;
    private static final int STUCK_THRESHOLD_MINUTES = 2;

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final UserServiceMetrics userServiceMetrics;

    // ── Main poll ──────────────────────────────────────────────────────────────

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval:5000}")
    @Transactional
    public void processOutboxEvents() {
        List<OutboxEvent> pendingEvents =
                outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING");

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("Found {} pending outbox events. Processing...", pendingEvents.size());

        userServiceMetrics.setOutboxQueueSize(pendingEvents.size());

        // Batch-mark IN_PROGRESS before sending — prevents next poll from re-processing
        pendingEvents.forEach(e -> e.setStatus("IN_PROGRESS"));
        outboxEventRepository.saveAll(pendingEvents);

        // Fire-and-forget sends: no blocking .get(), result handled in callback
        for (OutboxEvent event : pendingEvents) {
            try {
                // Parse payload to JsonNode so Kafka JsonSerializer doesn't double-escape it
                JsonNode payloadNode = objectMapper.readTree(event.getPayload());
                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), payloadNode)
                        .whenComplete((result, ex) -> onSendComplete(event, ex));
            } catch (Exception parseEx) {
                log.error("Failed to parse payload for outbox event '{}': {}",
                        event.getId(), parseEx.getMessage());
                event.setStatus("DEAD_LETTER");
                outboxEventRepository.save(event);
            }
        }
    }

    // ── Kafka send callback (runs on Kafka sender thread) ─────────────────────

    private void onSendComplete(OutboxEvent event, Throwable ex) {
        if (ex == null) {
            event.setStatus("COMPLETED");
            event.setProcessedAt(Instant.now());
            log.debug("Outbox event '{}' COMPLETED", event.getId());
        } else {
            int retries = event.getRetryCount() + 1;
            event.setRetryCount(retries);
            event.setLastRetriedAt(Instant.now());

            if (retries >= MAX_RETRIES) {
                event.setStatus("DEAD_LETTER");
                userServiceMetrics.recordOutboxDeadLetter();
                log.error("Outbox event '{}' -> DEAD_LETTER after {} retries. Cause: {}",
                        event.getId(), retries, ex.getMessage());
            } else {
                event.setStatus("PENDING"); // back in queue for next poll
                log.warn("Outbox event '{}' send failed, retry {}/{}. Cause: {}",
                        event.getId(), retries, MAX_RETRIES, ex.getMessage());
            }
        }
        outboxEventRepository.save(event);
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
        List<OutboxEvent> stuckEvents =
                outboxEventRepository.findByStatusAndCreatedAtBefore("IN_PROGRESS", threshold);

        if (stuckEvents.isEmpty()) {
            return;
        }

        log.warn("Recovering {} stuck IN_PROGRESS outbox events", stuckEvents.size());
        stuckEvents.forEach(e -> e.setStatus("PENDING"));
        outboxEventRepository.saveAll(stuckEvents);
    }
}
