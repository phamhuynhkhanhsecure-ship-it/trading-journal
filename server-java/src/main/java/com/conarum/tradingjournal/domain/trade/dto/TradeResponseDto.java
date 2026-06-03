package com.conarum.tradingjournal.domain.trade.dto;

import com.conarum.tradingjournal.domain.trade.model.Trade.TradeImage;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeRuleEntry;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class TradeResponseDto {
    private String id;
    private String date;
    private String instrument;
    private String side;
    private BigDecimal entryPrice;
    private BigDecimal exitPrice;
    private BigDecimal quantity;
    private BigDecimal pnl;
    private BigDecimal fees;
    private String notes;
    private List<String> tags;
    private List<TradeImage> images;
    private List<TradeRuleEntry> ruleChecklist;
    private BigDecimal stopLoss;
    private BigDecimal takeProfit;
    private int rating;
    private int disciplineScore;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isMissedTrade")
    private boolean isMissedTrade;
    
    private String playbookId;
    private String reviewNotes;
    private String mistakes;
    private String lessons;
    private String createdAt;
    private String updatedAt;
}
