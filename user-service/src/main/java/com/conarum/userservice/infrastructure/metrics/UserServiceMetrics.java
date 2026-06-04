package com.conarum.userservice.infrastructure.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Business metrics for the User Service.
 *
 *   userservice_billing_purchase_total     — successful premium purchases
 *   userservice_outbox_dead_letter_total   — billing/role-upgrade events that failed (ALERT!)
 *   userservice_outbox_queue_size          — current PENDING event count
 *   userservice_user_sync_total            — user login/sync events
 */
@Component
@Slf4j
public class UserServiceMetrics {

    private final Counter billingPurchaseCounter;
    private final Counter outboxDeadLetterCounter;
    private final Counter userSyncCounter;
    private final AtomicInteger outboxQueueSize = new AtomicInteger(0);

    public UserServiceMetrics(MeterRegistry registry) {
        billingPurchaseCounter = Counter.builder("userservice.billing.purchase")
                .description("Successful premium subscription purchases")
                .register(registry);

        outboxDeadLetterCounter = Counter.builder("userservice.outbox.dead_letter")
                .description("Outbox events moved to DEAD_LETTER — Saga may be broken!")
                .register(registry);

        userSyncCounter = Counter.builder("userservice.user.sync")
                .description("User login/sync events processed")
                .register(registry);

        Gauge.builder("userservice.outbox.queue_size", outboxQueueSize, AtomicInteger::get)
                .description("Current number of PENDING outbox events in user-service")
                .register(registry);
    }

    public void recordBillingPurchase()   { billingPurchaseCounter.increment(); }
    public void recordUserSync()          { userSyncCounter.increment(); }
    public void setOutboxQueueSize(int n) { outboxQueueSize.set(n); }

    public void recordOutboxDeadLetter() {
        outboxDeadLetterCounter.increment();
        log.error("[ALERT] UserService outbox DEAD_LETTER — Saga billing flow may be broken!");
    }
}
