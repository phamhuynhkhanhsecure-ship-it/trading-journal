package com.conarum.userservice.domain.audit.producer;

import com.conarum.userservice.domain.audit.dto.AuditLogEvent;
import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.infrastructure.outbox.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaAuditProducerService {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private static final String TOPIC = "audit-logs";

    public void sendAuditLog(AuditLogEvent event) {
        try {
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .topic(TOPIC)
                    .aggregateId(event.getTargetEntityId())
                    .eventType(AuditLogEvent.class.getSimpleName())
                    .payload(objectMapper.writeValueAsString(event))
                    .status("PENDING")
                    .createdAt(Instant.now())
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.info("Saved audit log to Outbox: {} by {}", event.getAction(), event.getPerformedBy());
        } catch (Exception e) {
            log.error("Failed to save audit log to Outbox: {}", e.getMessage());
        }
    }
}
