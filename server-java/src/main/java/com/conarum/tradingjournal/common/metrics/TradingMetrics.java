package com.conarum.tradingjournal.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Centralizes all business metrics for the Trading Service.
 *
 * Metrics exposed at /actuator/prometheus and scraped by Prometheus:
 *
 *   trading_trade_created_total          — trades created (by user)
 *   trading_trade_deleted_total          — trades deleted (by user)
 *   trading_ai_request_total             — AI requests (by type: coach|chat|vision)
 *   trading_outbox_dead_letter_total     — events that exceeded max retries (ALERT!)
 *   trading_outbox_queue_size            — current PENDING event count (live gauge)
 *   trading_http_requests_seconds        — HTTP request latency (auto via Actuator)
 */
@Component
@Slf4j
public class TradingMetrics {

    // ── Counters ──────────────────────────────────────────────────────────────

    private final Counter tradeCreatedCounter;
    private final Counter tradeDeletedCounter;
    private final Counter outboxDeadLetterCounter;

    // ── Gauge backing fields ──────────────────────────────────────────────────

    private final AtomicInteger outboxQueueSize = new AtomicInteger(0);

    // ── Timer ─────────────────────────────────────────────────────────────────

    private final Timer aiCoachTimer;
    private final Timer aiChatTimer;
    private final Timer aiVisionTimer;

    // ── AI request counters (by type) ─────────────────────────────────────────

    private final Counter aiCoachCounter;
    private final Counter aiChatCounter;
    private final Counter aiVisionCounter;

    public TradingMetrics(MeterRegistry registry) {
        // Trades
        tradeCreatedCounter = Counter.builder("trading.trade.created")
                .description("Total number of trades created")
                .register(registry);

        tradeDeletedCounter = Counter.builder("trading.trade.deleted")
                .description("Total number of trades deleted (including Drive cleanup)")
                .register(registry);

        // AI requests
        aiCoachCounter = Counter.builder("trading.ai.request")
                .tag("type", "coach")
                .description("Total AI Coach requests")
                .register(registry);

        aiChatCounter = Counter.builder("trading.ai.request")
                .tag("type", "chat")
                .description("Total AI Chat requests")
                .register(registry);

        aiVisionCounter = Counter.builder("trading.ai.request")
                .tag("type", "vision")
                .description("Total AI Vision requests")
                .register(registry);

        // AI latency timers
        aiCoachTimer = Timer.builder("trading.ai.latency")
                .tag("type", "coach")
                .description("AI Coach response latency")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);

        aiChatTimer = Timer.builder("trading.ai.latency")
                .tag("type", "chat")
                .description("AI Chat response latency")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);

        aiVisionTimer = Timer.builder("trading.ai.latency")
                .tag("type", "vision")
                .description("AI Vision response latency")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);

        // Outbox
        outboxDeadLetterCounter = Counter.builder("trading.outbox.dead_letter")
                .description("Outbox events moved to DEAD_LETTER — requires manual intervention")
                .register(registry);

        Gauge.builder("trading.outbox.queue_size", outboxQueueSize, AtomicInteger::get)
                .description("Current number of PENDING outbox events")
                .register(registry);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public void recordTradeCreated()  { tradeCreatedCounter.increment(); }
    public void recordTradeDeleted()  { tradeDeletedCounter.increment(); }

    public void recordAiCoach()   { aiCoachCounter.increment(); }
    public void recordAiChat()    { aiChatCounter.increment(); }
    public void recordAiVision()  { aiVisionCounter.increment(); }

    public Timer.Sample startAiCoachTimer()  { return Timer.start(); }
    public Timer.Sample startAiChatTimer()   { return Timer.start(); }
    public Timer.Sample startAiVisionTimer() { return Timer.start(); }

    public void stopAiCoachTimer(Timer.Sample sample)  { sample.stop(aiCoachTimer); }
    public void stopAiChatTimer(Timer.Sample sample)   { sample.stop(aiChatTimer); }
    public void stopAiVisionTimer(Timer.Sample sample) { sample.stop(aiVisionTimer); }

    public void recordOutboxDeadLetter() {
        outboxDeadLetterCounter.increment();
        log.error("[ALERT] Outbox DEAD_LETTER event count incremented — check dead_letter queue!");
    }

    public void setOutboxQueueSize(int size) { outboxQueueSize.set(size); }
}
