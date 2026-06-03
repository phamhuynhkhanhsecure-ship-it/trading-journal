package com.conarum.tradingjournal.domain.analytics.service;

import com.conarum.tradingjournal.domain.analytics.dto.UserRoleUpgradedEvent;
import com.conarum.tradingjournal.domain.analytics.model.AnalyticsConfig;
import com.conarum.tradingjournal.domain.analytics.repository.AnalyticsConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SagaUserRoleConsumerService Tests")
class SagaUserRoleConsumerServiceTest {

    @Mock private AnalyticsConfigRepository analyticsConfigRepository;

    @InjectMocks private SagaUserRoleConsumerService sagaUserRoleConsumerService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        var field = SagaUserRoleConsumerService.class.getDeclaredField("objectMapper");
        field.setAccessible(true);
        field.set(sagaUserRoleConsumerService, objectMapper);
    }

    @Test
    @DisplayName("Saga Step 3 - PREMIUM role should set AnalyticsConfig.premium = true")
    void consumeUserEvent_premiumRole_shouldUnlockPremiumAnalytics() throws Exception {
        // Arrange
        UserRoleUpgradedEvent event = UserRoleUpgradedEvent.builder()
                .userEmail("user@example.com")
                .newRole("PREMIUM")
                .build();
        String message = objectMapper.writeValueAsString(event);

        AnalyticsConfig existingConfig = AnalyticsConfig.builder()
                .userEmail("user@example.com")
                .isPremium(false)
                .build();

        when(analyticsConfigRepository.findByUserEmail("user@example.com")).thenReturn(Optional.of(existingConfig));
        when(analyticsConfigRepository.save(any())).thenReturn(existingConfig);

        // Act
        sagaUserRoleConsumerService.consumeUserEvent(message);

        // Assert: config saved with premium = true
        ArgumentCaptor<AnalyticsConfig> captor = ArgumentCaptor.forClass(AnalyticsConfig.class);
        verify(analyticsConfigRepository).save(captor.capture());
        assertThat(captor.getValue().isPremium()).isTrue();
    }

    @Test
    @DisplayName("Saga Step 3 - should create new AnalyticsConfig if not exists")
    void consumeUserEvent_configNotExists_shouldCreateNew() throws Exception {
        // Arrange
        UserRoleUpgradedEvent event = UserRoleUpgradedEvent.builder()
                .userEmail("newuser@example.com")
                .newRole("PREMIUM")
                .build();
        String message = objectMapper.writeValueAsString(event);

        when(analyticsConfigRepository.findByUserEmail("newuser@example.com")).thenReturn(Optional.empty());
        when(analyticsConfigRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        sagaUserRoleConsumerService.consumeUserEvent(message);

        // Assert: new config created with premium = true
        ArgumentCaptor<AnalyticsConfig> captor = ArgumentCaptor.forClass(AnalyticsConfig.class);
        verify(analyticsConfigRepository).save(captor.capture());
        assertThat(captor.getValue().getUserEmail()).isEqualTo("newuser@example.com");
        assertThat(captor.getValue().isPremium()).isTrue();
    }

    @Test
    @DisplayName("Saga Step 3 - non-PREMIUM role should NOT update config")
    void consumeUserEvent_nonPremiumRole_shouldDoNothing() throws Exception {
        // Arrange
        UserRoleUpgradedEvent event = UserRoleUpgradedEvent.builder()
                .userEmail("user@example.com")
                .newRole("BASIC")
                .build();
        String message = objectMapper.writeValueAsString(event);

        // Act
        sagaUserRoleConsumerService.consumeUserEvent(message);

        // Assert: nothing saved
        verifyNoInteractions(analyticsConfigRepository);
    }

    @Test
    @DisplayName("Saga Step 3 - malformed JSON should not throw")
    void consumeUserEvent_malformedJson_shouldNotThrow() {
        // Act (should handle gracefully)
        sagaUserRoleConsumerService.consumeUserEvent("not-json-{{{");
        // Verified implicitly — no exception, no interaction
        verifyNoInteractions(analyticsConfigRepository);
    }
}
