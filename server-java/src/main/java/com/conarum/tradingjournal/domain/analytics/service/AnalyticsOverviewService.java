package com.conarum.tradingjournal.domain.analytics.service;

import com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.Overview;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsOverviewService {

    private final TradeRepository tradeRepository;

    /**
     * Trading days per year for Sharpe Ratio annualisation.
     * Use 252 for stocks/forex (US trading days), 365 for crypto (24/7 markets).
     * Default: 365 — most users of this app trade crypto.
     */
    @Value("${app.analytics.trading-days-per-year:365}")
    private int tradingDaysPerYear;

    @Cacheable(value = "analytics", key = "#userEmail + '_' + (#filter.dateFrom != null && !#filter.dateFrom.isEmpty() ? #filter.dateFrom : 'all') + '_' + (#filter.dateTo != null && !#filter.dateTo.isEmpty() ? #filter.dateTo : 'all')")
    public Overview getOverview(String userEmail, DateRangeFilterDto filter) {
        log.info("CACHE MISS (getOverview): email={}, from={}, to={}", userEmail, filter.getDateFrom(), filter.getDateTo());
        List<Trade> trades = tradeRepository.findTradesWithFilter(userEmail, filter);
        log.info("Processing {} trades for overview", trades.size());
        
        BigDecimal totalPnl = BigDecimal.ZERO;
        BigDecimal totalFees = BigDecimal.ZERO;
        int winnersCount = 0;
        int losersCount = 0;
        BigDecimal grossProfit = BigDecimal.ZERO;
        BigDecimal grossLoss = BigDecimal.ZERO;
        
        Map<String, BigDecimal> dayMap = new HashMap<>();
        
        for (Trade t : trades) {
            BigDecimal fees = t.getFees() != null ? t.getFees() : BigDecimal.ZERO;
            BigDecimal pnl = t.getPnl() != null ? t.getPnl() : BigDecimal.ZERO;
            BigDecimal adjustedPnl = pnl.subtract(fees);
            totalPnl = totalPnl.add(adjustedPnl);
            totalFees = totalFees.add(fees);
            
            if (adjustedPnl.compareTo(BigDecimal.ZERO) > 0) {
                winnersCount++;
                grossProfit = grossProfit.add(adjustedPnl);
            } else if (adjustedPnl.compareTo(BigDecimal.ZERO) < 0) {
                losersCount++;
                grossLoss = grossLoss.add(adjustedPnl.abs());
            }
            
            dayMap.put(t.getDate(), dayMap.getOrDefault(t.getDate(), BigDecimal.ZERO).add(adjustedPnl));
        }

        BigDecimal avgWin = winnersCount == 0 ? BigDecimal.ZERO : grossProfit.divide(BigDecimal.valueOf(winnersCount), 4, RoundingMode.HALF_UP);
        BigDecimal avgLoss = losersCount == 0 ? BigDecimal.ZERO : grossLoss.divide(BigDecimal.valueOf(losersCount), 4, RoundingMode.HALF_UP);
        BigDecimal profitFactor = grossLoss.compareTo(BigDecimal.ZERO) > 0 ? grossProfit.divide(grossLoss, 4, RoundingMode.HALF_UP) : (grossProfit.compareTo(BigDecimal.ZERO) > 0 ? BigDecimal.valueOf(-1) : BigDecimal.ZERO);
        BigDecimal expectancy = trades.isEmpty() ? BigDecimal.ZERO : totalPnl.divide(BigDecimal.valueOf(trades.size()), 4, RoundingMode.HALF_UP);
        List<BigDecimal> dailyReturns = new ArrayList<>(dayMap.values());
        BigDecimal avgReturn = dailyReturns.isEmpty() ? BigDecimal.ZERO : dailyReturns.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(dailyReturns.size()), 4, RoundingMode.HALF_UP);
        
        double variance = 0;
        if (dailyReturns.size() > 1) {
            double avgRetDouble = avgReturn.doubleValue();
            double sumSquares = dailyReturns.stream().mapToDouble(v -> Math.pow(v.doubleValue() - avgRetDouble, 2)).sum();
            variance = sumSquares / (dailyReturns.size() - 1);
        }
        double stdDev = Math.sqrt(variance);
        // Annualise using configurable trading days (crypto=365, stocks=252)
        BigDecimal sharpeRatio = stdDev > 0
                ? BigDecimal.valueOf((avgReturn.doubleValue() / stdDev) * Math.sqrt(tradingDaysPerYear))
                : (avgReturn.compareTo(BigDecimal.ZERO) > 0 ? BigDecimal.valueOf(-1) : BigDecimal.ZERO);

        // Max Drawdown: use adjustedPnl (pnl - fees) — consistent with totalPnl logic above
        BigDecimal peak = BigDecimal.ZERO, cumPnl = BigDecimal.ZERO, maxDrawdown = BigDecimal.ZERO, currentDrawdown = BigDecimal.ZERO;
        for (Trade t : trades) {
            BigDecimal fees = t.getFees() != null ? t.getFees() : BigDecimal.ZERO;
            BigDecimal adjustedPnl = (t.getPnl() != null ? t.getPnl() : BigDecimal.ZERO).subtract(fees);
            cumPnl = cumPnl.add(adjustedPnl);
            if (cumPnl.compareTo(peak) > 0) peak = cumPnl;
            BigDecimal dd = peak.subtract(cumPnl);
            if (dd.compareTo(maxDrawdown) > 0) maxDrawdown = dd;
            currentDrawdown = dd;
        }

        List<Trade> tradesWithSLandTP = trades.stream().filter(t -> t.getStopLoss() != null && t.getStopLoss().compareTo(BigDecimal.ZERO) > 0 && t.getTakeProfit() != null && t.getTakeProfit().compareTo(BigDecimal.ZERO) > 0).collect(Collectors.toList());
        BigDecimal avgRR = BigDecimal.ZERO;
        if (!tradesWithSLandTP.isEmpty()) {
            double rrSum = tradesWithSLandTP.stream().mapToDouble(t -> {
                double risk = Math.abs(t.getEntryPrice().subtract(t.getStopLoss()).doubleValue());
                double reward = Math.abs(t.getTakeProfit().subtract(t.getEntryPrice()).doubleValue());
                return risk > 0 ? reward / risk : 0;
            }).sum();
            avgRR = BigDecimal.valueOf(rrSum / tradesWithSLandTP.size());
        }

        return Overview.builder()
                .totalTrades(trades.size())
                .totalPnl(totalPnl)
                .totalFees(totalFees)
                .winners(winnersCount)
                .losers(losersCount)
                .breakeven(trades.size() - winnersCount - losersCount)
                .winRate(trades.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf((double) winnersCount / trades.size() * 100))
                .avgWin(avgWin)
                .avgLoss(avgLoss)
                .grossProfit(grossProfit)
                .grossLoss(grossLoss)
                .profitFactor(profitFactor)
                .expectancy(expectancy)
                .sharpeRatio(sharpeRatio)
                .maxDrawdown(maxDrawdown)
                .currentDrawdown(currentDrawdown)
                .avgRR(avgRR)
                .tradingDays(dailyReturns.size())
                .build();
    }
}
