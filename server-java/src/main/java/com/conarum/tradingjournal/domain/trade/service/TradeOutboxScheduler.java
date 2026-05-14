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
                // Send to Kafka raw JSON string as configured in KafkaTemplate (StringSerializer)
                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), event.getPayload()).get(); // .get() for synchronous block to ensure it's sent
                
                // Mark as completed
                event.setStatus("COMPLETED");
                event.setProcessedAt(Instant.now());
                tradeOutboxEventRepository.save(event);
                
                log.debug("Successfully processed trade outbox event: {}", event.getId());
            } catch (Exception e) {
                log.error("Failed to process trade outbox event: {}. Error: {}", event.getId(), e.getMessage());
                // We leave it as PENDING to retry later, or we could mark it as FAILED if retries exceeded
            }
        }
    }
}
