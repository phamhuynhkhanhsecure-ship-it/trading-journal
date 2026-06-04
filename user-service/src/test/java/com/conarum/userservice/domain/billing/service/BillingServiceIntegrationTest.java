package com.conarum.userservice.domain.billing.service;

import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.domain.billing.dto.BillingTransactionResponseDto;
import com.conarum.userservice.domain.billing.model.BillingTransaction;
import com.conarum.userservice.domain.billing.repository.BillingTransactionRepository;
import com.conarum.userservice.infrastructure.outbox.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Saga Step 1 Integration Test:
 * BillingService.purchasePremium() → MongoDB (BillingTransaction + OutboxEvent)
 *
 * Verifies:
 * - BillingTransaction persisted correctly
 * - OutboxEvent created with status PENDING and correct topic/payload
 * - Both writes are part of the same logical operation (Outbox pattern)
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@DisplayName("BillingService Integration Tests — Saga Step 1")
class BillingServiceIntegrationTest {

    @Autowired BillingService billingService;
    @Autowired BillingTransactionRepository billingTransactionRepository;
    @Autowired OutboxEventRepository outboxEventRepository;

    // Redis is used by UserServiceImpl (not BillingServiceImpl) — mock it here
    @MockBean StringRedisTemplate stringRedisTemplate;

    @BeforeEach
    void setUp() {
        billingTransactionRepository.deleteAll();
        outboxEventRepository.deleteAll();
    }

    @Test
    @DisplayName("purchasePremium — should persist BillingTransaction to MongoDB")
    void purchasePremium_shouldPersistTransaction() {
        BillingTransactionResponseDto result = billingService.purchasePremium("user@test.com");

        assertThat(result).isNotNull();
        List<BillingTransaction> transactions = billingTransactionRepository.findAll();
        assertThat(transactions).hasSize(1);

        BillingTransaction tx = transactions.get(0);
        assertThat(tx.getUserEmail()).isEqualTo("user@test.com");
        assertThat(tx.getPackageId()).isEqualTo("PREMIUM_ANALYTICS");
        assertThat(tx.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(19.99));
        assertThat(tx.getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("purchasePremium — should create PENDING OutboxEvent with billing-events topic")
    void purchasePremium_shouldCreateOutboxEvent() {
        billingService.purchasePremium("user@test.com");

        List<OutboxEvent> events = outboxEventRepository.findAll();
        assertThat(events).hasSize(1);

        OutboxEvent evt = events.get(0);
        assertThat(evt.getTopic()).isEqualTo("billing-events");
        assertThat(evt.getStatus()).isEqualTo("PENDING");
        assertThat(evt.getEventType()).isEqualTo("PaymentProcessedEvent");
        assertThat(evt.getPayload()).contains("user@test.com");
        assertThat(evt.getPayload()).contains("SUCCESS");
        assertThat(evt.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("purchasePremium — OutboxEvent.aggregateId matches BillingTransaction.id")
    void purchasePremium_outboxAggregateIdMatchesTransactionId() {
        billingService.purchasePremium("user@test.com");

        BillingTransaction tx = billingTransactionRepository.findAll().get(0);
        OutboxEvent evt = outboxEventRepository.findAll().get(0);

        assertThat(evt.getAggregateId()).isEqualTo(tx.getId());
    }

    @Test
    @DisplayName("purchasePremium — multiple users each get their own transaction and outbox event")
    void purchasePremium_multipleUsers_eachGetOwnTransactionAndEvent() {
        billingService.purchasePremium("user-a@test.com");
        billingService.purchasePremium("user-b@test.com");

        assertThat(billingTransactionRepository.findAll()).hasSize(2);
        assertThat(outboxEventRepository.findAll()).hasSize(2);

        List<BillingTransaction> transactions = billingTransactionRepository.findAll();
        assertThat(transactions).extracting(BillingTransaction::getUserEmail)
                .containsExactlyInAnyOrder("user-a@test.com", "user-b@test.com");
    }
}
