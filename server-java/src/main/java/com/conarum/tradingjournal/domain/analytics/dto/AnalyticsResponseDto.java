package com.conarum.tradingjournal.domain.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

public class AnalyticsResponseDto {

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Overview {
        private int totalTrades;
        private double totalPnl;
        private double totalFees;
        private int winners;
        private int losers;
        private int breakeven;
        private double winRate;
        private double avgWin;
        private double avgLoss;
        private double grossProfit;
        private double grossLoss;
        private double profitFactor;
        private double expectancy;
        private double sharpeRatio;
        private double maxDrawdown;
        private double currentDrawdown;
        private double avgRR;
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
        private double pnl;
        private double winRate;
        private double avgPnl;
        
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
        private double avgRR;
        private double tpHitRate;
        private double slHitRate;
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
        private double totalPnl;
        private double avgPnlPerDay;
        private int totalTrades;
        private double winRate;
    }
}
