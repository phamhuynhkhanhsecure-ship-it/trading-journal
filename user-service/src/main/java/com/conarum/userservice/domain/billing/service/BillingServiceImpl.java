package com.conarum.userservice.domain.billing.service;

import com.conarum.userservice.domain.billing.dto.BillingTransactionResponseDto;
import com.conarum.userservice.infrastructure.metrics.UserServiceMetrics;
import com.conarum.userservice.domain.billing.dto.PaymentProcessedEvent;
import com.conarum.userservice.domain.billing.mapper.BillingMapper;
import com.conarum.userservice.domain.billing.model.BillingTransaction;
import com.conarum.userservice.domain.billing.repository.BillingTransactionRepository;
import com.conarum.userservice.common.model.OutboxEvent;
import com.conarum.userservice.infrastructure.outbox.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class BillingServiceImpl implements BillingService {

    private final BillingTransactionRepository billingTransactionRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final BillingMapper billingMapper;
    private final ObjectMapper objectMapper;
    private final UserServiceMetrics userServiceMetrics;

    @Override
    @Transactional
    public BillingTransactionResponseDto purchasePremium(String userEmail) {
        log.info("Processing premium purchase for user: {}", userEmail);

        // 1. Create Mock Billing Transaction
        BillingTransaction transaction = BillingTransaction.builder()
                .userEmail(userEmail)
                .packageId("PREMIUM_ANALYTICS")
                .amount(java.math.BigDecimal.valueOf(19.99))
                .status("SUCCESS")
                .createdAt(Instant.now())
                .build();

        BillingTransaction savedTransaction = billingTransactionRepository.save(transaction);

        // 2. Create Outbox Event for Saga (Dual-write solved via Outbox)
        PaymentProcessedEvent event = PaymentProcessedEvent.builder()
                .transactionId(savedTransaction.getId())
                .userEmail(userEmail)
                .packageId(savedTransaction.getPackageId())
                .status(savedTransaction.getStatus())
                .build();

        try {
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .topic("billing-events")
                    .aggregateId(savedTransaction.getId())
                    .eventType(PaymentProcessedEvent.class.getSimpleName())
                    .payload(objectMapper.writeValueAsString(event))
                    .status("PENDING")
                    .createdAt(Instant.now())
                    .build();

            outboxEventRepository.save(outboxEvent);
            log.info("Saved PaymentProcessedEvent to outbox for transaction: {}", savedTransaction.getId());
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize PaymentProcessedEvent for outbox", e);
        }

        userServiceMetrics.recordBillingPurchase();
        return billingMapper.toDto(savedTransaction);
    }
}
