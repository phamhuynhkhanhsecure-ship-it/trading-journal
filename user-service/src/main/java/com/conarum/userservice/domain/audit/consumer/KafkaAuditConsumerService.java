package com.conarum.userservice.domain.audit.consumer;

import com.conarum.userservice.domain.audit.model.AuditLog;
import com.conarum.userservice.domain.audit.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaAuditConsumerService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "audit-logs", groupId = "${spring.kafka.consumer.group-id:user-service-group}")
    public void consumeAuditLog(String message) {
        try {
            log.debug("Received audit log message: {}", message);
            
            Map<String, Object> eventMap = objectMapper.readValue(message, Map.class);
            
            String action = (String) eventMap.get("action");
            String performedBy = (String) eventMap.get("performedBy");
            String targetEntity = (String) eventMap.get("targetEntity");
            String targetEntityId = (String) eventMap.get("targetEntityId");
            String details = (String) eventMap.get("details");
            
            Instant timestamp = Instant.now();
            if (eventMap.get("timestamp") != null) {
                try {
                    String tsStr = eventMap.get("timestamp").toString();
                    if (tsStr.contains("T")) {
                         timestamp = Instant.parse(tsStr);
                    } else {
                         double epochDouble = Double.parseDouble(tsStr);
                         timestamp = Instant.ofEpochMilli((long)(epochDouble * 1000));
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse timestamp, using current time. Error: {}", e.getMessage());
                }
            }

            AuditLog auditLog = AuditLog.builder()
                    .action(action)
                    .performedBy(performedBy)
                    .targetEntity(targetEntity)
                    .targetEntityId(targetEntityId)
                    .details(details)
                    .timestamp(timestamp)
                    .build();

            auditLogRepository.save(auditLog);
            log.info("Persisted audit log for action: {} on target: {}", action, targetEntityId);
            
        } catch (Exception e) {
            log.error("Error processing audit log message: {}", e.getMessage(), e);
        }
    }
}
