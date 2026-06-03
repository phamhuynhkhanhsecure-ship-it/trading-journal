package com.conarum.userservice.domain.billing.consumer;

import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.domain.billing.dto.PaymentProcessedEvent;
import com.conarum.userservice.domain.group.model.Group;
import com.conarum.userservice.domain.group.repository.GroupRepository;
import com.conarum.userservice.domain.role.model.Role;
import com.conarum.userservice.domain.role.repository.RoleRepository;
import com.conarum.userservice.domain.user.model.User;
import com.conarum.userservice.domain.user.repository.UserRepository;
import com.conarum.userservice.infrastructure.outbox.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.ArrayList;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SagaBillingConsumerService Tests")
class SagaBillingConsumerServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private GroupRepository groupRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private StringRedisTemplate redisTemplate;

    @InjectMocks private SagaBillingConsumerService sagaBillingConsumerService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private User testUser;
    private Group premiumGroup;

    @BeforeEach
    void setUp() throws Exception {
        var field = SagaBillingConsumerService.class.getDeclaredField("objectMapper");
        field.setAccessible(true);
        field.set(sagaBillingConsumerService, objectMapper);

        testUser = new User();
        testUser.setEmail("user@example.com");
        testUser.setName("Test User");
        testUser.setGroupIds(new ArrayList<>());

        premiumGroup = new Group();
        premiumGroup.setId("group-premium-001");
        premiumGroup.setName("Premium User");
        premiumGroup.setRoleIds(new ArrayList<>());
    }

    @Test
    @DisplayName("Saga Step 2 - SUCCESS payment should upgrade user to Premium group")
    void consumeBillingEvent_successPayment_shouldUpgradeUserGroup() throws Exception {
        // Arrange
        PaymentProcessedEvent event = PaymentProcessedEvent.builder()
                .transactionId("txn-001")
                .userEmail("user@example.com")
                .packageId("PREMIUM_ANALYTICS")
                .status("SUCCESS")
                .build();
        String message = objectMapper.writeValueAsString(event);

        when(userRepository.findById("user@example.com")).thenReturn(Optional.of(testUser));
        when(groupRepository.findFirstByName("Premium User")).thenReturn(Optional.of(premiumGroup));
        when(userRepository.save(any())).thenReturn(testUser);

        // Act
        sagaBillingConsumerService.consumeBillingEvent(message);

        // Assert: user saved with premium group
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getGroupIds()).contains("group-premium-001");

        // Assert: Redis cache cleared
        verify(redisTemplate).delete("cache:user_groups:user@example.com");

        // Assert: UserRoleUpgradedEvent saved to outbox
        ArgumentCaptor<OutboxEvent> outboxCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(outboxCaptor.capture());
        assertThat(outboxCaptor.getValue().getTopic()).isEqualTo("user-events");
        assertThat(outboxCaptor.getValue().getEventType()).isEqualTo("UserRoleUpgradedEvent");
        assertThat(outboxCaptor.getValue().getStatus()).isEqualTo("PENDING");
        assertThat(outboxCaptor.getValue().getPayload()).contains("PREMIUM");
    }

    @Test
    @DisplayName("Saga Step 2 - should NOT upgrade user if already Premium")
    void consumeBillingEvent_alreadyPremium_shouldNotDuplicate() throws Exception {
        // Arrange: user already has the premium group
        testUser.getGroupIds().add("group-premium-001");

        PaymentProcessedEvent event = PaymentProcessedEvent.builder()
                .transactionId("txn-002")
                .userEmail("user@example.com")
                .status("SUCCESS")
                .build();
        String message = objectMapper.writeValueAsString(event);

        when(userRepository.findById("user@example.com")).thenReturn(Optional.of(testUser));
        when(groupRepository.findFirstByName("Premium User")).thenReturn(Optional.of(premiumGroup));

        // Act
        sagaBillingConsumerService.consumeBillingEvent(message);

        // Assert: user NOT saved again, outbox NOT written
        verify(userRepository, never()).save(any());
        verify(outboxEventRepository, never()).save(any());
        verify(redisTemplate, never()).delete(anyString());
    }

    @Test
    @DisplayName("Saga Step 2 - FAILED payment should NOT upgrade user")
    void consumeBillingEvent_failedPayment_shouldNotUpgrade() throws Exception {
        // Arrange
        PaymentProcessedEvent event = PaymentProcessedEvent.builder()
                .transactionId("txn-003")
                .userEmail("user@example.com")
                .status("FAILED")
                .build();
        String message = objectMapper.writeValueAsString(event);

        // Act
        sagaBillingConsumerService.consumeBillingEvent(message);

        // Assert: nothing should happen
        verify(userRepository, never()).findById(any());
        verify(outboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("Saga Step 2 - user not found should log warning and not throw")
    void consumeBillingEvent_userNotFound_shouldNotThrow() throws Exception {
        // Arrange
        PaymentProcessedEvent event = PaymentProcessedEvent.builder()
                .transactionId("txn-004")
                .userEmail("ghost@example.com")
                .status("SUCCESS")
                .build();
        String message = objectMapper.writeValueAsString(event);

        when(userRepository.findById("ghost@example.com")).thenReturn(Optional.empty());

        // Act (should NOT throw)
        sagaBillingConsumerService.consumeBillingEvent(message);

        // Assert: no save, no outbox
        verify(userRepository, never()).save(any());
        verify(outboxEventRepository, never()).save(any());
    }

    @Test
    @DisplayName("Saga Step 2 - creates Premium group if not exists")
    void consumeBillingEvent_premiumGroupNotExist_shouldCreateGroup() throws Exception {
        // Arrange
        PaymentProcessedEvent event = PaymentProcessedEvent.builder()
                .transactionId("txn-005")
                .userEmail("user@example.com")
                .status("SUCCESS")
                .build();
        String message = objectMapper.writeValueAsString(event);

        Group newGroup = new Group();
        newGroup.setId("group-new-001");
        newGroup.setName("Premium User");
        newGroup.setRoleIds(new ArrayList<>());

        when(userRepository.findById("user@example.com")).thenReturn(Optional.of(testUser));
        when(groupRepository.findFirstByName("Premium User")).thenReturn(Optional.empty());
        when(groupRepository.save(any())).thenReturn(newGroup);
        when(userRepository.save(any())).thenReturn(testUser);
        when(roleRepository.findByName("Analytics")).thenReturn(Optional.empty());

        // Act
        sagaBillingConsumerService.consumeBillingEvent(message);

        // Assert: new group created
        verify(groupRepository).save(any(Group.class));
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getGroupIds()).contains("group-new-001");
    }

    @Test
    @DisplayName("Saga Step 2 - malformed JSON should not throw")
    void consumeBillingEvent_malformedJson_shouldNotThrow() {
        // Act & Assert (should handle gracefully)
        sagaBillingConsumerService.consumeBillingEvent("not-valid-json{{{");
        // No exception thrown — verified implicitly
        verifyNoInteractions(userRepository, outboxEventRepository);
    }
}
