package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
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
public class TradeOutboxScheduler {

    private static final int MAX_RETRIES = 3;

    private final TradeOutboxEventRepository tradeOutboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelayString = "${app.outbox.poll-interval:5000}")
    @Transactional
    public void processOutboxEvents() {
        List<TradeOutboxEvent> pendingEvents = tradeOutboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING");

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("Found {} pending trade outbox events. Processing...", pendingEvents.size());

        for (TradeOutboxEvent event : pendingEvents) {
            try {
                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload())
                        .get(5, java.util.concurrent.TimeUnit.SECONDS);

                event.setStatus("COMPLETED");
                event.setProcessedAt(Instant.now());
                log.debug("Successfully processed trade outbox event: {}", event.getId());
            } catch (Exception e) {
                // Fix 2: retry limit — move to DEAD_LETTER after MAX_RETRIES
                int retries = event.getRetryCount() + 1;
                event.setRetryCount(retries);
                event.setLastRetriedAt(Instant.now());

                if (retries >= MAX_RETRIES) {
                    event.setStatus("DEAD_LETTER");
                    log.error("Trade outbox event '{}' moved to DEAD_LETTER after {} retries. Manual intervention required.",
                            event.getId(), retries);
                } else {
                    log.warn("Trade outbox event '{}' failed, retry {}/{}. Error: {}",
                            event.getId(), retries, MAX_RETRIES, e.getMessage());
                }
            }
            tradeOutboxEventRepository.save(event);
        }
    }
}
