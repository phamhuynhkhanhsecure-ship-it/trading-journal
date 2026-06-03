package com.conarum.tradingjournal.domain.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

public class AnalyticsResponseDto {

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Overview {
        private int totalTrades;
        private BigDecimal totalPnl;
        private BigDecimal totalFees;
        private int winners;
        private int losers;
        private int breakeven;
        private BigDecimal winRate;
        private BigDecimal avgWin;
        private BigDecimal avgLoss;
        private BigDecimal grossProfit;
        private BigDecimal grossLoss;
        private BigDecimal profitFactor;
        private BigDecimal expectancy;
        private BigDecimal sharpeRatio;
        private BigDecimal maxDrawdown;
        private BigDecimal currentDrawdown;
        private BigDecimal avgRR;
        private int tradingDays;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ByCategory {
        private String category; // day, instrument, side, tag, playbookId
        private int trades;
        private BigDecimal pnl;
        private BigDecimal winRate;
        private BigDecimal avgPnl;
        
        // Specific fields
        private Integer dayIndex;
        private String name;
        private String color;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Streaks {
        private int currentStreak;
        private int maxWinStreak;
        private int maxLossStreak;
        private List<Object> heatmap;
        private List<Object> compliance;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Risk {
        private int tradesWithSL;
        private int tradesWithTP;
        private BigDecimal avgRR;
        private BigDecimal tpHitRate;
        private BigDecimal slHitRate;
        private List<Object> rrData;
        private List<Object> drawdownCurve;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Mood {
        private String mood;
        private int days;
        private BigDecimal totalPnl;
        private BigDecimal avgPnlPerDay;
        private int totalTrades;
        private BigDecimal winRate;
    }
}
