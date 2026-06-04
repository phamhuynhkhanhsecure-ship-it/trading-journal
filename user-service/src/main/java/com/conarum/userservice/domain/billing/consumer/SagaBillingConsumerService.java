package com.conarum.userservice.domain.billing.consumer;

import com.conarum.userservice.domain.billing.dto.PaymentProcessedEvent;
import com.conarum.userservice.domain.billing.dto.UserRoleUpgradedEvent;
import com.conarum.userservice.domain.group.model.Group;
import com.conarum.userservice.domain.group.repository.GroupRepository;
import com.conarum.userservice.domain.role.repository.RoleRepository;
import com.conarum.userservice.domain.user.model.User;
import com.conarum.userservice.domain.user.repository.UserRepository;
import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.infrastructure.outbox.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;

/**
 * Saga Step 2: Consumes PaymentProcessedEvent from billing-events topic.
 * Upgrades user role and emits UserRoleUpgradedEvent via Outbox pattern.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SagaBillingConsumerService {

    private final UserRepository userRepository;
    private final GroupRepository groupRepository;
    private final RoleRepository roleRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @KafkaListener(topics = "billing-events", groupId = "${spring.kafka.consumer.group-id:user-service-group}")
    @Transactional
    public void consumeBillingEvent(String message) {
        try {
            PaymentProcessedEvent event = objectMapper.readValue(message, PaymentProcessedEvent.class);
            log.info("Received PaymentProcessedEvent for user: {}", event.getUserEmail());

            if ("SUCCESS".equals(event.getStatus())) {
                User user = userRepository.findById(event.getUserEmail()).orElse(null);
                if (user == null) {
                    log.warn("User not found for email: {}", event.getUserEmail());
                    return;
                }

                // Find or create Premium Group
                Group premiumGroup = groupRepository.findFirstByName("Premium User").orElseGet(() -> {
                    Group group = new Group();
                    group.setName("Premium User");
                    group.setDescription("Premium Analytics Group");
                    
                    roleRepository.findByName("Analytics").ifPresent(role -> {
                        if (group.getRoleIds() == null) {
                            group.setRoleIds(new ArrayList<>());
                        }
                        group.getRoleIds().add(role.getId());
                    });
                    
                    return groupRepository.save(group);
                });

                // Assign to user if not already present
                if (user.getGroupIds() == null) {
                    user.setGroupIds(new ArrayList<>());
                }

                if (!user.getGroupIds().contains(premiumGroup.getId())) {
                    user.getGroupIds().add(premiumGroup.getId());
                    userRepository.save(user);
                    log.info("Upgraded user {} to Premium User group.", user.getEmail());
                    
                    // Clear user cache so API Gateway and Frontend get fresh permissions
                    String cacheKey = "cache:user_groups:" + user.getEmail();
                    redisTemplate.delete(cacheKey);
                    log.info("Cleared cache for user: {}", user.getEmail());

                    // Emit UserRoleUpgradedEvent via Outbox (Next step in Saga)
                    UserRoleUpgradedEvent upgradedEvent = UserRoleUpgradedEvent.builder()
                            .userEmail(user.getEmail())
                            .newRole("PREMIUM")
                            .build();

                    OutboxEvent outboxEvent = OutboxEvent.builder()
                            .topic("user-events")
                            .aggregateId(user.getEmail())
                            .eventType(UserRoleUpgradedEvent.class.getSimpleName())
                            .payload(objectMapper.writeValueAsString(upgradedEvent))
                            .status("PENDING")
                            .createdAt(Instant.now())
                            .build();

                    outboxEventRepository.save(outboxEvent);
                    log.info("Saved UserRoleUpgradedEvent to Outbox for user: {}", user.getEmail());
                } else {
                    log.info("User {} is already a Premium User.", user.getEmail());
                }
            } else {
                log.error("Payment failed for user {}. Saga Compensation could trigger refund here.", event.getUserEmail());
            }
        } catch (Exception e) {
            log.error("Error processing billing event message: {}", e.getMessage(), e);
        }
    }
}
