package com.conarum.userservice.domain.billing.service;

import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.domain.billing.dto.BillingTransactionResponseDto;
import com.conarum.userservice.domain.billing.mapper.BillingMapper;
import com.conarum.userservice.domain.billing.model.BillingTransaction;
import com.conarum.userservice.domain.billing.repository.BillingTransactionRepository;
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

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BillingServiceImpl Tests")
class BillingServiceImplTest {

    @Mock private BillingTransactionRepository billingTransactionRepository;
    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private BillingMapper billingMapper;

    @InjectMocks private BillingServiceImpl billingService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private BillingTransaction savedTransaction;

    @BeforeEach
    void setUp() throws Exception {
        // Inject real ObjectMapper vào service (vì @InjectMocks không inject final fields)
        var field = BillingServiceImpl.class.getDeclaredField("objectMapper");
        field.setAccessible(true);
        field.set(billingService, objectMapper);

        savedTransaction = BillingTransaction.builder()
                .id("txn-001")
                .userEmail("user@example.com")
                .packageId("PREMIUM_ANALYTICS")
                .amount(BigDecimal.valueOf(19.99))
                .status("SUCCESS")
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("purchasePremium - should save BillingTransaction and OutboxEvent atomically")
    void purchasePremium_shouldSaveTransactionAndOutboxEvent() {
        // Arrange
        when(billingTransactionRepository.save(any())).thenReturn(savedTransaction);
        when(billingMapper.toDto(savedTransaction)).thenReturn(new BillingTransactionResponseDto());

        // Act
        billingService.purchasePremium("user@example.com");

        // Assert: BillingTransaction saved
        verify(billingTransactionRepository, times(1)).save(any(BillingTransaction.class));

        // Assert: OutboxEvent saved with correct fields
        ArgumentCaptor<OutboxEvent> outboxCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository, times(1)).save(outboxCaptor.capture());

        OutboxEvent capturedOutbox = outboxCaptor.getValue();
        assertThat(capturedOutbox.getTopic()).isEqualTo("billing-events");
        assertThat(capturedOutbox.getAggregateId()).isEqualTo("txn-001");
        assertThat(capturedOutbox.getEventType()).isEqualTo("PaymentProcessedEvent");
        assertThat(capturedOutbox.getStatus()).isEqualTo("PENDING");
        assertThat(capturedOutbox.getPayload()).contains("user@example.com");
        assertThat(capturedOutbox.getPayload()).contains("SUCCESS");
    }

    @Test
    @DisplayName("purchasePremium - should create transaction with correct amount and packageId")
    void purchasePremium_shouldCreateCorrectTransaction() {
        // Arrange
        when(billingTransactionRepository.save(any())).thenReturn(savedTransaction);
        when(billingMapper.toDto(any())).thenReturn(new BillingTransactionResponseDto());

        // Act
        billingService.purchasePremium("user@example.com");

        // Assert
        ArgumentCaptor<BillingTransaction> transactionCaptor = ArgumentCaptor.forClass(BillingTransaction.class);
        verify(billingTransactionRepository).save(transactionCaptor.capture());

        BillingTransaction captured = transactionCaptor.getValue();
        assertThat(captured.getUserEmail()).isEqualTo("user@example.com");
        assertThat(captured.getPackageId()).isEqualTo("PREMIUM_ANALYTICS");
        assertThat(captured.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(19.99));
        assertThat(captured.getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("purchasePremium - should return mapped DTO")
    void purchasePremium_shouldReturnMappedDto() {
        // Arrange
        BillingTransactionResponseDto expectedDto = new BillingTransactionResponseDto();
        when(billingTransactionRepository.save(any())).thenReturn(savedTransaction);
        when(billingMapper.toDto(savedTransaction)).thenReturn(expectedDto);

        // Act
        BillingTransactionResponseDto result = billingService.purchasePremium("user@example.com");

        // Assert
        assertThat(result).isSameAs(expectedDto);
    }

    @Test
    @DisplayName("purchasePremium - should throw RuntimeException when serialization fails")
    void purchasePremium_shouldThrowWhenSerializationFails() throws Exception {
        // Arrange: inject broken ObjectMapper
        ObjectMapper brokenMapper = mock(ObjectMapper.class);
        when(brokenMapper.writeValueAsString(any())).thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("fail") {});
        var field = BillingServiceImpl.class.getDeclaredField("objectMapper");
        field.setAccessible(true);
        field.set(billingService, brokenMapper);

        when(billingTransactionRepository.save(any())).thenReturn(savedTransaction);

        // Act & Assert
        assertThatThrownBy(() -> billingService.purchasePremium("user@example.com"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to serialize PaymentProcessedEvent for outbox");
    }
}
