package com.conarum.tradingjournal.domain.trade.dto;

import com.conarum.tradingjournal.domain.trade.model.Trade.TradeImage;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeRuleEntry;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class TradeRequestDto {
    @NotBlank(message = "Date is required")
    private String date; // Format: YYYY-MM-DD
    
    @NotBlank(message = "Instrument is required")
    private String instrument;
    
    @NotBlank(message = "Side is required")
    private String side; // LONG, SHORT
    
    private double entryPrice = 0;
    private double exitPrice = 0;
    private double quantity = 0;
    private double pnl = 0;
    private double fees = 0;
    private String notes = "";
    private List<String> tags = new ArrayList<>();
    private List<TradeImage> images = new ArrayList<>();
    private List<TradeRuleEntry> ruleChecklist = new ArrayList<>();
    private double stopLoss = 0;
    private double takeProfit = 0;
    private int rating = 0;
    private int disciplineScore = 0;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isMissedTrade")
    private boolean isMissedTrade = false;
    
    private String playbookId = "";
    private String reviewNotes = "";
    private String mistakes = "";
    private String lessons = "";
}
