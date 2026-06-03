package com.conarum.tradingjournal.domain.trade.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "trade_outbox_events")
public class TradeOutboxEvent {
    @Id
    private String id;
    private String topic;
    private String aggregateId;
    private String eventType;
    private String payload; // JSON representation of the event
    private String status; // PENDING, COMPLETED, DEAD_LETTER
    private Instant createdAt;
    private Instant processedAt;

    // Fix 2: retry tracking
    @Builder.Default
    private int retryCount = 0;
    private Instant lastRetriedAt;
}
