package com.conarum.tradingjournal.domain.analytics.service;

import com.conarum.tradingjournal.domain.analytics.dto.UserRoleUpgradedEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SagaUserRoleConsumerService {

    private final ObjectMapper objectMapper;
    private final com.conarum.tradingjournal.domain.analytics.repository.AnalyticsConfigRepository analyticsConfigRepository;

    @KafkaListener(topics = "user-events", groupId = "${spring.kafka.consumer.group-id:server-java-group}")
    public void consumeUserEvent(String message) {
        try {
            UserRoleUpgradedEvent event = objectMapper.readValue(message, UserRoleUpgradedEvent.class);
            log.info("Received UserRoleUpgradedEvent for user: {}", event.getUserEmail());

            if ("PREMIUM".equals(event.getNewRole())) {
                log.info("SAGA COMPLETE: Unlocking Premium Analytics features for user '{}'", event.getUserEmail());
                
                com.conarum.tradingjournal.domain.analytics.model.AnalyticsConfig config = analyticsConfigRepository.findByUserEmail(event.getUserEmail())
                        .orElse(com.conarum.tradingjournal.domain.analytics.model.AnalyticsConfig.builder().userEmail(event.getUserEmail()).build());
                config.setPremium(true);
                analyticsConfigRepository.save(config);
            }
        } catch (Exception e) {
            log.error("Error processing user event message: {}", e.getMessage(), e);
        }
    }
}
