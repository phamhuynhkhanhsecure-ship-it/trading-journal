package com.conarum.tradingjournal.domain.trade.dto;

import com.conarum.tradingjournal.domain.trade.model.Trade.TradeImage;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeRuleEntry;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
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
    
    private BigDecimal entryPrice = BigDecimal.ZERO;
    private BigDecimal exitPrice = BigDecimal.ZERO;
    private BigDecimal quantity = BigDecimal.ZERO;
    private BigDecimal pnl = BigDecimal.ZERO;
    private BigDecimal fees = BigDecimal.ZERO;
    private String notes = "";
    private List<String> tags = new ArrayList<>();
    private List<TradeImage> images = new ArrayList<>();
    private List<TradeRuleEntry> ruleChecklist = new ArrayList<>();
    private BigDecimal stopLoss = BigDecimal.ZERO;
    private BigDecimal takeProfit = BigDecimal.ZERO;
    private int rating = 0;
    private int disciplineScore = 0;
    
    @com.fasterxml.jackson.annotation.JsonProperty("isMissedTrade")
    private boolean isMissedTrade = false;
    
    private String playbookId = "";
    private String reviewNotes = "";
    private String mistakes = "";
    private String lessons = "";
}
