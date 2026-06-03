package com.conarum.tradingjournal.domain.analytics.service;

import com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.ByCategory;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.playbook.model.Playbook;
import com.conarum.tradingjournal.domain.playbook.repository.PlaybookRepository;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsPerformanceService {

    private final TradeRepository tradeRepository;
    private final PlaybookRepository playbookRepository;

    private List<Trade> getTrades(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = tradeRepository.findTradesWithFilter(userEmail, filter);
        trades.forEach(t -> {
            BigDecimal pnl = t.getPnl() != null ? t.getPnl() : BigDecimal.ZERO;
            BigDecimal fees = t.getFees() != null ? t.getFees() : BigDecimal.ZERO;
            t.setPnl(pnl.subtract(fees));
        });
        return trades;
    }

    public List<ByCategory> getByDayOfWeek(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        String[] dayNames = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        List<ByCategory> result = new ArrayList<>();
        
        for (int i = 0; i < 7; i++) {
            int dayIndex = i;
            List<Trade> dayTrades = trades.stream()
                .filter(t -> {
                    try {
                        LocalDate date = LocalDate.parse(t.getDate());
                        int d = date.getDayOfWeek().getValue();
                        int mappedIndex = d == 7 ? 0 : d;
                        return mappedIndex == dayIndex;
                    } catch (Exception e) { return false; }
                }).collect(Collectors.toList());
                
            long wins = dayTrades.stream().filter(t -> t.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            BigDecimal pnl = dayTrades.stream().map(Trade::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
            
            result.add(ByCategory.builder()
                .category(dayNames[i])
                .dayIndex(i)
                .trades(dayTrades.size())
                .pnl(pnl)
                .winRate(dayTrades.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf((double) wins / dayTrades.size() * 100))
                .avgPnl(dayTrades.isEmpty() ? BigDecimal.ZERO : pnl.divide(BigDecimal.valueOf(dayTrades.size()), 4, RoundingMode.HALF_UP))
                .build());
        }
        return result;
    }

    public List<ByCategory> getByInstrument(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        Map<String, List<Trade>> map = trades.stream().collect(Collectors.groupingBy(Trade::getInstrument));
        
        return map.entrySet().stream().map(e -> {
            String instrument = e.getKey();
            List<Trade> instTrades = e.getValue();
            long wins = instTrades.stream().filter(t -> t.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            BigDecimal pnl = instTrades.stream().map(Trade::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
            
            return ByCategory.builder()
                .category(instrument)
                .trades(instTrades.size())
                .pnl(pnl)
                .winRate(instTrades.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf((double) wins / instTrades.size() * 100))
                .avgPnl(instTrades.isEmpty() ? BigDecimal.ZERO : pnl.divide(BigDecimal.valueOf(instTrades.size()), 4, RoundingMode.HALF_UP))
                .build();
        }).sorted((a, b) -> b.getPnl().compareTo(a.getPnl())).collect(Collectors.toList());
    }

    public List<ByCategory> getBySide(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        return List.of("LONG", "SHORT").stream().map(side -> {
            List<Trade> sideTrades = trades.stream().filter(t -> side.equals(t.getSide())).collect(Collectors.toList());
            long wins = sideTrades.stream().filter(t -> t.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            BigDecimal pnl = sideTrades.stream().map(Trade::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
            
            return ByCategory.builder()
                .category(side)
                .trades(sideTrades.size())
                .pnl(pnl)
                .winRate(sideTrades.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf((double) wins / sideTrades.size() * 100))
                .avgPnl(sideTrades.isEmpty() ? BigDecimal.ZERO : pnl.divide(BigDecimal.valueOf(sideTrades.size()), 4, RoundingMode.HALF_UP))
                .build();
        }).collect(Collectors.toList());
    }

    public List<ByCategory> getByTag(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        Map<String, List<Trade>> map = new HashMap<>();
        
        for (Trade t : trades) {
            if (t.getTags() != null) {
                for (String tag : t.getTags()) {
                    map.computeIfAbsent(tag, k -> new ArrayList<>()).add(t);
                }
            }
        }
        
        return map.entrySet().stream().map(e -> {
            String tag = e.getKey();
            List<Trade> tagTrades = e.getValue();
            long wins = tagTrades.stream().filter(t -> t.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            BigDecimal pnl = tagTrades.stream().map(Trade::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
            
            return ByCategory.builder()
                .category(tag)
                .trades(tagTrades.size())
                .pnl(pnl)
                .winRate(tagTrades.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf((double) wins / tagTrades.size() * 100))
                .avgPnl(tagTrades.isEmpty() ? BigDecimal.ZERO : pnl.divide(BigDecimal.valueOf(tagTrades.size()), 4, RoundingMode.HALF_UP))
                .build();
        }).sorted((a, b) -> b.getPnl().compareTo(a.getPnl())).collect(Collectors.toList());
    }

    public List<ByCategory> getByPlaybook(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter).stream()
                .filter(t -> t.getPlaybookId() != null && !t.getPlaybookId().isEmpty())
                .collect(Collectors.toList());
                
        Set<String> pbIds = trades.stream().map(Trade::getPlaybookId).collect(Collectors.toSet());
        List<Playbook> playbooks = playbookRepository.findAllById(pbIds);
        Map<String, Playbook> pbMap = playbooks.stream().collect(Collectors.toMap(Playbook::getId, p -> p));
        
        Map<String, List<Trade>> map = trades.stream().collect(Collectors.groupingBy(Trade::getPlaybookId));
        
        return map.entrySet().stream().map(e -> {
            String pbId = e.getKey();
            List<Trade> pbTrades = e.getValue();
            Playbook pb = pbMap.get(pbId);
            String name = pb != null ? pb.getName() : "Unknown";
            String color = pb != null ? pb.getColor() : "#58a6ff";
            
            long wins = pbTrades.stream().filter(t -> t.getPnl().compareTo(BigDecimal.ZERO) > 0).count();
            BigDecimal pnl = pbTrades.stream().map(Trade::getPnl).reduce(BigDecimal.ZERO, BigDecimal::add);
            
            return ByCategory.builder()
                .category(pbId)
                .name(name)
                .color(color)
                .trades(pbTrades.size())
                .pnl(pnl)
                .winRate(pbTrades.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf((double) wins / pbTrades.size() * 100))
                .avgPnl(pbTrades.isEmpty() ? BigDecimal.ZERO : pnl.divide(BigDecimal.valueOf(pbTrades.size()), 4, RoundingMode.HALF_UP))
                .build();
        }).sorted((a, b) -> b.getPnl().compareTo(a.getPnl())).collect(Collectors.toList());
    }
    public com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.Streaks getStreaks(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        
        Map<String, BigDecimal> dayMap = new TreeMap<>();
        for (Trade t : trades) {
            dayMap.put(t.getDate(), dayMap.getOrDefault(t.getDate(), BigDecimal.ZERO).add(t.getPnl()));
        }
        
        List<Map<String, Object>> dayData = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : dayMap.entrySet()) {
            dayData.add(Map.of("date", entry.getKey(), "day_pnl", entry.getValue()));
        }
        
        int currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempWin = 0, tempLoss = 0;
        for (Map<String, Object> d : dayData) {
            BigDecimal pnl = (BigDecimal) d.get("day_pnl");
            if (pnl.compareTo(BigDecimal.ZERO) > 0) { tempWin++; tempLoss = 0; if (tempWin > maxWinStreak) maxWinStreak = tempWin; }
            else if (pnl.compareTo(BigDecimal.ZERO) < 0) { tempLoss++; tempWin = 0; if (tempLoss > maxLossStreak) maxLossStreak = tempLoss; }
            else { tempWin = 0; tempLoss = 0; }
        }
        
        if (!dayData.isEmpty()) {
            BigDecimal lastPnl = (BigDecimal) dayData.get(dayData.size() - 1).get("day_pnl");
            if (lastPnl.compareTo(BigDecimal.ZERO) > 0) {
                for (int i = dayData.size() - 1; i >= 0; i--) {
                    if (((BigDecimal) dayData.get(i).get("day_pnl")).compareTo(BigDecimal.ZERO) > 0) currentStreak++; else break;
                }
            } else if (lastPnl.compareTo(BigDecimal.ZERO) < 0) {
                for (int i = dayData.size() - 1; i >= 0; i--) {
                    if (((BigDecimal) dayData.get(i).get("day_pnl")).compareTo(BigDecimal.ZERO) < 0) currentStreak--; else break;
                }
            }
        }
        
        List<Object> heatmap = dayData.stream()
                .map(d -> Map.of("date", d.get("date"), "pnl", d.get("day_pnl")))
                .collect(Collectors.toList());
                
        List<Trade> tradesDocs = trades.stream().filter(t -> t.getRuleChecklist() != null && !t.getRuleChecklist().isEmpty()).collect(Collectors.toList());
        Map<String, long[]> compMap = new HashMap<>();
        for (Trade t : tradesDocs) {
            long[] counts = compMap.computeIfAbsent(t.getDate(), k -> new long[]{0, 0});
            for (Trade.TradeRuleEntry r : t.getRuleChecklist()) {
                counts[0]++;
                if (r.isFollowed()) counts[1]++;
            }
        }
        
        List<Object> compliance = compMap.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> Map.of("date", e.getKey(), "score", e.getValue()[0] > 0 ? Math.round(((double) e.getValue()[1] / e.getValue()[0]) * 100) : 0))
                .collect(Collectors.toList());
                
        return com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.Streaks.builder()
                .currentStreak(currentStreak)
                .maxWinStreak(maxWinStreak)
                .maxLossStreak(maxLossStreak)
                .heatmap(heatmap)
                .compliance(compliance)
                .build();
    }

    public List<Map<String, Object>> getRolling(String userEmail, int window) {
        List<Trade> trades = tradeRepository.findByUserEmailOrderByDateDesc(userEmail);
        Collections.reverse(trades);
        trades.forEach(t -> {
            BigDecimal pnl = t.getPnl() != null ? t.getPnl() : BigDecimal.ZERO;
            BigDecimal fees = t.getFees() != null ? t.getFees() : BigDecimal.ZERO;
            t.setPnl(pnl.subtract(fees));
        });
        
        Map<String, BigDecimal> dayMap = new TreeMap<>();
        for (Trade t : trades) {
            dayMap.put(t.getDate(), dayMap.getOrDefault(t.getDate(), BigDecimal.ZERO).add(t.getPnl()));
        }
        
        List<Map.Entry<String, BigDecimal>> days = new ArrayList<>(dayMap.entrySet());
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (int i = 0; i < days.size(); i++) {
            int start = Math.max(0, i - window + 1);
            List<Map.Entry<String, BigDecimal>> windowDays = days.subList(start, i + 1);
            BigDecimal totalPnl = windowDays.stream().map(Map.Entry::getValue).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal avgPnl = totalPnl.divide(BigDecimal.valueOf(windowDays.size()), 4, RoundingMode.HALF_UP);
            
            result.add(Map.of(
                "date", days.get(i).getKey(),
                "dayPnl", days.get(i).getValue(),
                "rollingAvg", avgPnl,
                "rollingTotal", totalPnl,
                "windowSize", windowDays.size()
            ));
        }
        return result;
    }
}
