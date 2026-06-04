package com.conarum.userservice.domain.billing.consumer;

import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.domain.billing.dto.PaymentProcessedEvent;
import com.conarum.userservice.domain.group.model.Group;
import com.conarum.userservice.domain.group.repository.GroupRepository;
import com.conarum.userservice.domain.user.model.User;
import com.conarum.userservice.domain.user.repository.UserRepository;
import com.conarum.userservice.infrastructure.outbox.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Saga Step 2 Integration Test:
 * SagaBillingConsumerService.consumeBillingEvent() → MongoDB (User role upgrade + OutboxEvent)
 *
 * Verifies:
 * - User is assigned to Premium group on SUCCESS payment
 * - Redis cache is invalidated
 * - UserRoleUpgradedEvent is written to outbox for Saga Step 3
 * - Idempotency: already-premium user not upgraded twice
 * - FAILED payment: nothing happens
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@DisplayName("SagaBillingConsumerService Integration Tests — Saga Step 2")
class SagaBillingConsumerIntegrationTest {

    @Autowired SagaBillingConsumerService sagaBillingConsumerService;
    @Autowired UserRepository userRepository;
    @Autowired GroupRepository groupRepository;
    @Autowired OutboxEventRepository outboxEventRepository;

    @MockBean StringRedisTemplate stringRedisTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private User testUser;
    private Group premiumGroup;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        groupRepository.deleteAll();
        outboxEventRepository.deleteAll();

        // Create test user
        testUser = new User();
        testUser.setEmail("user@test.com");
        testUser.setName("Test User");
        testUser.setGroupIds(new ArrayList<>());
        userRepository.save(testUser);

        // Create Premium group
        premiumGroup = new Group();
        premiumGroup.setName("Premium User");
        premiumGroup.setDescription("Premium Analytics Group");
        premiumGroup.setRoleIds(new ArrayList<>());
        groupRepository.save(premiumGroup);

        // Mock Redis operations
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOps);
    }

    @Test
    @DisplayName("Saga Step 2 — SUCCESS payment upgrades user to Premium group")
    void consumeBillingEvent_successPayment_upgradesUserGroup() throws Exception {
        String message = objectMapper.writeValueAsString(PaymentProcessedEvent.builder()
                .transactionId("txn-001")
                .userEmail("user@test.com")
                .packageId("PREMIUM_ANALYTICS")
                .status("SUCCESS")
                .build());

        sagaBillingConsumerService.consumeBillingEvent(message);

        User updated = userRepository.findById("user@test.com").orElseThrow();
        assertThat(updated.getGroupIds()).contains(premiumGroup.getId());
    }

    @Test
    @DisplayName("Saga Step 2 — SUCCESS payment invalidates Redis permission cache")
    void consumeBillingEvent_successPayment_invalidatesRedisCache() throws Exception {
        String message = objectMapper.writeValueAsString(PaymentProcessedEvent.builder()
                .transactionId("txn-001")
                .userEmail("user@test.com")
                .status("SUCCESS")
                .build());

        sagaBillingConsumerService.consumeBillingEvent(message);

        verify(stringRedisTemplate).delete("cache:user_groups:user@test.com");
    }

    @Test
    @DisplayName("Saga Step 2 — SUCCESS payment writes UserRoleUpgradedEvent to outbox")
    void consumeBillingEvent_successPayment_writesOutboxEvent() throws Exception {
        String message = objectMapper.writeValueAsString(PaymentProcessedEvent.builder()
                .transactionId("txn-001")
                .userEmail("user@test.com")
                .status("SUCCESS")
                .build());

        sagaBillingConsumerService.consumeBillingEvent(message);

        List<OutboxEvent> events = outboxEventRepository.findAll();
        assertThat(events).hasSize(1);

        OutboxEvent evt = events.get(0);
        assertThat(evt.getTopic()).isEqualTo("user-events");
        assertThat(evt.getEventType()).isEqualTo("UserRoleUpgradedEvent");
        assertThat(evt.getStatus()).isEqualTo("PENDING");
        assertThat(evt.getPayload()).contains("PREMIUM");
        assertThat(evt.getPayload()).contains("user@test.com");
    }

    @Test
    @DisplayName("Saga Step 2 — idempotent: already Premium user NOT upgraded twice")
    void consumeBillingEvent_alreadyPremium_notUpgradedTwice() throws Exception {
        // Pre-assign user to premium group
        testUser.setGroupIds(new ArrayList<>(List.of(premiumGroup.getId())));
        userRepository.save(testUser);

        String message = objectMapper.writeValueAsString(PaymentProcessedEvent.builder()
                .transactionId("txn-002")
                .userEmail("user@test.com")
                .status("SUCCESS")
                .build());

        sagaBillingConsumerService.consumeBillingEvent(message);

        // User still has exactly one group entry (no duplicate)
        User user = userRepository.findById("user@test.com").orElseThrow();
        assertThat(user.getGroupIds()).hasSize(1);
        assertThat(user.getGroupIds()).containsExactly(premiumGroup.getId());

        // No new outbox event
        assertThat(outboxEventRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("Saga Step 2 — FAILED payment: nothing changes")
    void consumeBillingEvent_failedPayment_noChanges() throws Exception {
        String message = objectMapper.writeValueAsString(PaymentProcessedEvent.builder()
                .transactionId("txn-003")
                .userEmail("user@test.com")
                .status("FAILED")
                .build());

        sagaBillingConsumerService.consumeBillingEvent(message);

        User user = userRepository.findById("user@test.com").orElseThrow();
        assertThat(user.getGroupIds()).isEmpty();
        assertThat(outboxEventRepository.findAll()).isEmpty();
        verifyNoInteractions(stringRedisTemplate);
    }

    @Test
    @DisplayName("Saga Step 2 — user not found: logs warning, no crash")
    void consumeBillingEvent_userNotFound_noThrow() throws Exception {
        String message = objectMapper.writeValueAsString(PaymentProcessedEvent.builder()
                .transactionId("txn-004")
                .userEmail("ghost@test.com")
                .status("SUCCESS")
                .build());

        sagaBillingConsumerService.consumeBillingEvent(message);

        assertThat(outboxEventRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("Saga Step 2 — Premium group created automatically if not exists")
    void consumeBillingEvent_premiumGroupNotExists_groupCreated() throws Exception {
        groupRepository.deleteAll(); // Remove pre-created group

        String message = objectMapper.writeValueAsString(PaymentProcessedEvent.builder()
                .transactionId("txn-005")
                .userEmail("user@test.com")
                .status("SUCCESS")
                .build());

        sagaBillingConsumerService.consumeBillingEvent(message);

        // Premium group should have been auto-created
        Optional<Group> createdGroup = groupRepository.findFirstByName("Premium User");
        assertThat(createdGroup).isPresent();

        User user = userRepository.findById("user@test.com").orElseThrow();
        assertThat(user.getGroupIds()).contains(createdGroup.get().getId());
    }

    @Test
    @DisplayName("Saga Step 2 — malformed JSON: no exception, no side effects")
    void consumeBillingEvent_malformedJson_noThrow() {
        sagaBillingConsumerService.consumeBillingEvent("not-valid-json{{{");

        assertThat(userRepository.findById("user@test.com").orElseThrow().getGroupIds()).isEmpty();
        assertThat(outboxEventRepository.findAll()).isEmpty();
    }
}
