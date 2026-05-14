package com.conarum.tradingjournal.domain.trade.dto;

import com.conarum.tradingjournal.domain.trade.model.Trade.TradeImage;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeRuleEntry;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class TradeResponseDto {
    private String id;
    private String date;
    private String instrument;
    private String side;
    private double entryPrice;
    private double exitPrice;
    private double quantity;
    private double pnl;
    private double fees;
    private String notes;
    private List<String> tags;
    private List<TradeImage> images;
    private List<TradeRuleEntry> ruleChecklist;
    private double stopLoss;
    private double takeProfit;
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
