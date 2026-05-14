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
                
                // Send to Kafka
                kafkaTemplate.send(event.getTopic(), event.getAggregateId(), payloadNode).get(); // .get() for synchronous block to ensure it's sent
                
                // Mark as completed
                event.setStatus("COMPLETED");
                event.setProcessedAt(Instant.now());
                outboxEventRepository.save(event);
                
                log.debug("Successfully processed outbox event: {}", event.getId());
            } catch (Exception e) {
                log.error("Failed to process outbox event: {}. Error: {}", event.getId(), e.getMessage());
            }
        }
    }
}
