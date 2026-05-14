package com.conarum.tradingjournal.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeCreatedEvent implements Serializable {
    private String tradeId;
    private String userId;
    private String symbol;
    private String action; // BUY or SELL
    private LocalDateTime createdAt;
}
