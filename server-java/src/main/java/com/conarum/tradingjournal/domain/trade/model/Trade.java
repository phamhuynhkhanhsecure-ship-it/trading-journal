package com.conarum.tradingjournal.domain.trade.model;

import com.conarum.tradingjournal.common.model.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Document(collection = "trades")
@CompoundIndex(name = "user_date_idx", def = "{'userEmail': 1, 'date': -1}")
public class Trade extends BaseEntity {
    private String date; // Format: YYYY-MM-DD
    private String instrument;
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
    private boolean isMissedTrade = false;
    @Indexed
    private String playbookId = "";
    private String reviewNotes = "";
    private String mistakes = "";
    private String lessons = "";

    @Getter
    @Setter
    public static class TradeImage {
        private String id = UUID.randomUUID().toString();
        private String filename;
        private String originalName;
        private String mimeType;
        private long size;
        private String caption = "";
        private int sortOrder = 0;
        private String createdAt;
        private String driveFileId = "";
    }

    @Getter
    @Setter
    public static class TradeRuleEntry {
        private String ruleId;
        private String ruleName;
        private boolean followed;
    }
}
