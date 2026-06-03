package com.conarum.userservice.infrastructure.outbox;

import com.conarum.userservice.common.model.OutboxEvent;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxScheduler {

    private static final int MAX_RETRIES = 3;

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval:5000}")
    @Transactional
    public void processOutboxEvents() {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING");

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("Found {} pending outbox events. Processing...", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            try {
                // Parse payload string back to JsonNode so Kafka JsonSerializer doesn't double-escape it
                JsonNode payloadNode = objectMapper.readTree(event.getPayload());

                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), payloadNode)
                        .get(5, java.util.concurrent.TimeUnit.SECONDS);

                event.setStatus("COMPLETED");
                event.setProcessedAt(Instant.now());
                log.debug("Successfully processed outbox event: {}", event.getId());
            } catch (Exception e) {
                // Fix 2: retry limit — move to DEAD_LETTER after MAX_RETRIES
                int retries = event.getRetryCount() + 1;
                event.setRetryCount(retries);
                event.setLastRetriedAt(Instant.now());

                if (retries >= MAX_RETRIES) {
                    event.setStatus("DEAD_LETTER");
                    log.error("Outbox event '{}' moved to DEAD_LETTER after {} retries. Manual intervention required.",
                            event.getId(), retries);
                } else {
                    log.warn("Outbox event '{}' failed, retry {}/{}. Error: {}",
                            event.getId(), retries, MAX_RETRIES, e.getMessage());
                }
            }
            outboxEventRepository.save(event);
        }
    }
}
