package com.conarum.tradingjournal.domain.analytics.service;

import com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.Risk;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsRiskService {

    private final TradeRepository tradeRepository;

    private List<Trade> getTrades(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = tradeRepository.findTradesWithFilter(userEmail, filter);
        trades.forEach(t -> t.setPnl(t.getPnl().subtract(t.getFees() != null ? t.getFees() : BigDecimal.ZERO)));
        return trades;
    }

    public Risk getRisk(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        
        List<Trade> withSL = trades.stream().filter(t -> t.getStopLoss().compareTo(BigDecimal.ZERO) > 0).collect(Collectors.toList());
        List<Trade> withTP = trades.stream().filter(t -> t.getTakeProfit().compareTo(BigDecimal.ZERO) > 0).collect(Collectors.toList());
        
        List<Object> rrData = new ArrayList<>();
        for (Trade t : withSL) {
            double risk = Math.abs(t.getEntryPrice().subtract(t.getStopLoss()).doubleValue());
            double actualReward = "LONG".equals(t.getSide()) ? t.getExitPrice().subtract(t.getEntryPrice()).doubleValue() : t.getEntryPrice().subtract(t.getExitPrice()).doubleValue();
            double plannedReward = t.getTakeProfit().compareTo(BigDecimal.ZERO) > 0 ? Math.abs(t.getTakeProfit().subtract(t.getEntryPrice()).doubleValue()) : 0;
            
            boolean hitTP = t.getTakeProfit().compareTo(BigDecimal.ZERO) > 0 && (("LONG".equals(t.getSide()) && t.getExitPrice().compareTo(t.getTakeProfit()) >= 0) || ("SHORT".equals(t.getSide()) && t.getExitPrice().compareTo(t.getTakeProfit()) <= 0));
            boolean hitSL = ("LONG".equals(t.getSide()) && t.getExitPrice().compareTo(t.getStopLoss()) <= 0) || ("SHORT".equals(t.getSide()) && t.getExitPrice().compareTo(t.getStopLoss()) >= 0);
            
            rrData.add(Map.of(
                "date", t.getDate(),
                "instrument", t.getInstrument(),
                "side", t.getSide(),
                "riskPips", risk,
                "actualRR", risk > 0 ? actualReward / risk : 0,
                "plannedRR", risk > 0 && plannedReward > 0 ? plannedReward / risk : 0,
                "pnl", t.getPnl(),
                "hitTP", hitTP,
                "hitSL", hitSL
            ));
        }
        
        double avgRR = 0;
        long tpHits = rrData.stream().filter(r -> (Boolean) ((Map<?,?>)r).get("hitTP")).count();
        long slHits = rrData.stream().filter(r -> (Boolean) ((Map<?,?>)r).get("hitSL")).count();
        
        List<Map<?, ?>> plannedRRList = rrData.stream().map(r -> (Map<?,?>)r).filter(r -> (Double) r.get("plannedRR") > 0).collect(Collectors.toList());
        if (!plannedRRList.isEmpty()) {
            avgRR = plannedRRList.stream().mapToDouble(r -> (Double) r.get("plannedRR")).sum() / plannedRRList.size();
        }
        
        BigDecimal cumPnl = BigDecimal.ZERO;
        BigDecimal peak = BigDecimal.ZERO;
        List<Object> drawdownCurve = new ArrayList<>();
        String lastDate = "";
        for (Trade t : trades) {
            cumPnl = cumPnl.add(t.getPnl());
            if (cumPnl.compareTo(peak) > 0) peak = cumPnl;
            Map<String, Object> point = Map.of("date", t.getDate(), "cumPnl", cumPnl, "drawdown", peak.subtract(cumPnl), "peak", peak);
            if (!t.getDate().equals(lastDate)) {
                drawdownCurve.add(point);
            } else {
                drawdownCurve.set(drawdownCurve.size() - 1, point);
            }
            lastDate = t.getDate();
        }
        
        return Risk.builder()
                .tradesWithSL(withSL.size())
                .tradesWithTP(withTP.size())
                .avgRR(BigDecimal.valueOf(avgRR))
                .tpHitRate(rrData.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf((double) tpHits / rrData.size() * 100))
                .slHitRate(rrData.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf((double) slHits / rrData.size() * 100))
                .rrData(rrData)
                .drawdownCurve(drawdownCurve)
                .build();
    }
}
