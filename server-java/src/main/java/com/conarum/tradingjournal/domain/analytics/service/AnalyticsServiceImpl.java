package com.conarum.tradingjournal.domain.analytics.service;

import com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.*;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.journal.model.JournalEntry;
import com.conarum.tradingjournal.domain.journal.repository.JournalEntryRepository;
import com.conarum.tradingjournal.domain.playbook.model.Playbook;
import com.conarum.tradingjournal.domain.playbook.repository.PlaybookRepository;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeRuleEntry;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.kafka.annotation.KafkaListener;
import com.conarum.tradingjournal.common.event.TradeCreatedEvent;
import com.conarum.tradingjournal.config.KafkaConfig;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

    private final TradeRepository tradeRepository;
    private final PlaybookRepository playbookRepository;
    private final JournalEntryRepository journalEntryRepository;

    private List<Trade> getTrades(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = tradeRepository.findTradesWithFilter(userEmail, filter);
        // Adjust PnL with fees like Node.js
        trades.forEach(t -> t.setPnl(t.getPnl() - t.getFees()));
        return trades;
    }

    @Override
    @Cacheable(value = "analytics", key = "#userEmail + '_' + (#filter.dateFrom != null && !#filter.dateFrom.isEmpty() ? #filter.dateFrom : 'all') + '_' + (#filter.dateTo != null && !#filter.dateTo.isEmpty() ? #filter.dateTo : 'all')")
    public Overview getOverview(String userEmail, DateRangeFilterDto filter) {
        log.info("CACHE MISS (getOverview): email={}, from={}, to={}", userEmail, filter.getDateFrom(), filter.getDateTo());
        List<Trade> trades = tradeRepository.findTradesWithFilter(userEmail, filter);
        log.info("Processing {} trades for overview", trades.size());
        log.debug("Found {} trades for overview calculation", trades.size());
        
        double totalPnl = 0;
        double totalFees = 0;
        int winnersCount = 0;
        int losersCount = 0;
        double grossProfit = 0;
        double grossLoss = 0;
        
        Map<String, Double> dayMap = new HashMap<>();
        
        for (Trade t : trades) {
            double adjustedPnl = t.getPnl() - t.getFees();
            totalPnl += adjustedPnl;
            totalFees += t.getFees();
            
            if (adjustedPnl > 0) {
                winnersCount++;
                grossProfit += adjustedPnl;
            } else if (adjustedPnl < 0) {
                losersCount++;
                grossLoss += Math.abs(adjustedPnl);
            }
            
            dayMap.put(t.getDate(), dayMap.getOrDefault(t.getDate(), 0.0) + adjustedPnl);
        }

        double avgWin = winnersCount == 0 ? 0 : grossProfit / winnersCount;
        double avgLoss = losersCount == 0 ? 0 : grossLoss / losersCount;
        double profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? -1 : 0);
        double expectancy = trades.isEmpty() ? 0 : totalPnl / trades.size();
        List<Double> dailyReturns = new ArrayList<>(dayMap.values());
        double avgReturn = dailyReturns.isEmpty() ? 0 : dailyReturns.stream().mapToDouble(d -> d).sum() / dailyReturns.size();
        double variance = 0;
        if (dailyReturns.size() > 1) {
            double sumSquares = dailyReturns.stream().mapToDouble(v -> Math.pow(v - avgReturn, 2)).sum();
            variance = sumSquares / (dailyReturns.size() - 1);
        }
        double stdDev = Math.sqrt(variance);
        double sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : (avgReturn > 0 ? -1 : 0);

        double peak = 0, cumPnl = 0, maxDrawdown = 0, currentDrawdown = 0;
        for (Trade t : trades) {
            cumPnl += t.getPnl();
            if (cumPnl > peak) peak = cumPnl;
            double dd = peak - cumPnl;
            if (dd > maxDrawdown) maxDrawdown = dd;
            currentDrawdown = dd;
        }

        List<Trade> tradesWithSLandTP = trades.stream().filter(t -> t.getStopLoss() > 0 && t.getTakeProfit() > 0).collect(Collectors.toList());
        double avgRR = 0;
        if (!tradesWithSLandTP.isEmpty()) {
            double rrSum = tradesWithSLandTP.stream().mapToDouble(t -> {
                double risk = Math.abs(t.getEntryPrice() - t.getStopLoss());
                double reward = Math.abs(t.getTakeProfit() - t.getEntryPrice());
                return risk > 0 ? reward / risk : 0;
            }).sum();
            avgRR = rrSum / tradesWithSLandTP.size();
        }

        return Overview.builder()
                .totalTrades(trades.size())
                .totalPnl(totalPnl)
                .totalFees(totalFees)
                .winners(winnersCount)
                .losers(losersCount)
                .breakeven(trades.size() - winnersCount - losersCount)
                .winRate(trades.isEmpty() ? 0 : ((double) winnersCount / trades.size() * 100))
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

    @Override
    public List<ByCategory> getByDayOfWeek(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        String[] dayNames = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
        List<ByCategory> result = new ArrayList<>();
        
        for (int i = 0; i < 7; i++) {
            int dayIndex = i; // Map to Java DayOfWeek if needed, but keeping logic consistent
            List<Trade> dayTrades = trades.stream()
                .filter(t -> {
                    try {
                        LocalDate date = LocalDate.parse(t.getDate());
                        int d = date.getDayOfWeek().getValue(); // 1(Mon) to 7(Sun)
                        int mappedIndex = d == 7 ? 0 : d;
                        return mappedIndex == dayIndex;
                    } catch (Exception e) { return false; }
                }).collect(Collectors.toList());
                
            long wins = dayTrades.stream().filter(t -> t.getPnl() > 0).count();
            double pnl = dayTrades.stream().mapToDouble(Trade::getPnl).sum();
            
            result.add(ByCategory.builder()
                .category(dayNames[i])
                .dayIndex(i)
                .trades(dayTrades.size())
                .pnl(pnl)
                .winRate(dayTrades.isEmpty() ? 0 : ((double) wins / dayTrades.size() * 100))
                .avgPnl(dayTrades.isEmpty() ? 0 : pnl / dayTrades.size())
                .build());
        }
        return result;
    }

    @Override
    public List<ByCategory> getByInstrument(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        Map<String, List<Trade>> map = trades.stream().collect(Collectors.groupingBy(Trade::getInstrument));
        
        return map.entrySet().stream().map(e -> {
            String instrument = e.getKey();
            List<Trade> instTrades = e.getValue();
            long wins = instTrades.stream().filter(t -> t.getPnl() > 0).count();
            double pnl = instTrades.stream().mapToDouble(Trade::getPnl).sum();
            
            return ByCategory.builder()
                .category(instrument)
                .trades(instTrades.size())
                .pnl(pnl)
                .winRate(instTrades.isEmpty() ? 0 : ((double) wins / instTrades.size() * 100))
                .avgPnl(instTrades.isEmpty() ? 0 : pnl / instTrades.size())
                .build();
        }).sorted((a, b) -> Double.compare(b.getPnl(), a.getPnl())).collect(Collectors.toList());
    }

    @Override
    public List<ByCategory> getBySide(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        return List.of("LONG", "SHORT").stream().map(side -> {
            List<Trade> sideTrades = trades.stream().filter(t -> side.equals(t.getSide())).collect(Collectors.toList());
            long wins = sideTrades.stream().filter(t -> t.getPnl() > 0).count();
            double pnl = sideTrades.stream().mapToDouble(Trade::getPnl).sum();
            
            return ByCategory.builder()
                .category(side)
                .trades(sideTrades.size())
                .pnl(pnl)
                .winRate(sideTrades.isEmpty() ? 0 : ((double) wins / sideTrades.size() * 100))
                .avgPnl(sideTrades.isEmpty() ? 0 : pnl / sideTrades.size())
                .build();
        }).collect(Collectors.toList());
    }

    @Override
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
            long wins = tagTrades.stream().filter(t -> t.getPnl() > 0).count();
            double pnl = tagTrades.stream().mapToDouble(Trade::getPnl).sum();
            
            return ByCategory.builder()
                .category(tag)
                .trades(tagTrades.size())
                .pnl(pnl)
                .winRate(tagTrades.isEmpty() ? 0 : ((double) wins / tagTrades.size() * 100))
                .avgPnl(tagTrades.isEmpty() ? 0 : pnl / tagTrades.size())
                .build();
        }).sorted((a, b) -> Double.compare(b.getPnl(), a.getPnl())).collect(Collectors.toList());
    }

    @Override
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
            
            long wins = pbTrades.stream().filter(t -> t.getPnl() > 0).count();
            double pnl = pbTrades.stream().mapToDouble(Trade::getPnl).sum();
            
            return ByCategory.builder()
                .category(pbId)
                .name(name)
                .color(color)
                .trades(pbTrades.size())
                .pnl(pnl)
                .winRate(pbTrades.isEmpty() ? 0 : ((double) wins / pbTrades.size() * 100))
                .avgPnl(pbTrades.isEmpty() ? 0 : pnl / pbTrades.size())
                .build();
        }).sorted((a, b) -> Double.compare(b.getPnl(), a.getPnl())).collect(Collectors.toList());
    }

    // Simplified fallback to memory implementation for Streaks & Rolling to match Node exactly
    @Override
    public Streaks getStreaks(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        
        // Group by date
        Map<String, Double> dayMap = new TreeMap<>(); // Sorted map
        for (Trade t : trades) {
            dayMap.put(t.getDate(), dayMap.getOrDefault(t.getDate(), 0.0) + t.getPnl());
        }
        
        List<Map<String, Object>> dayData = new ArrayList<>();
        for (Map.Entry<String, Double> entry : dayMap.entrySet()) {
            dayData.add(Map.of("date", entry.getKey(), "day_pnl", entry.getValue()));
        }
        
        int currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempWin = 0, tempLoss = 0;
        for (Map<String, Object> d : dayData) {
            double pnl = (double) d.get("day_pnl");
            if (pnl > 0) { tempWin++; tempLoss = 0; if (tempWin > maxWinStreak) maxWinStreak = tempWin; }
            else if (pnl < 0) { tempLoss++; tempWin = 0; if (tempLoss > maxLossStreak) maxLossStreak = tempLoss; }
            else { tempWin = 0; tempLoss = 0; }
        }
        
        if (!dayData.isEmpty()) {
            double lastPnl = (double) dayData.get(dayData.size() - 1).get("day_pnl");
            if (lastPnl > 0) {
                for (int i = dayData.size() - 1; i >= 0; i--) {
                    if ((double) dayData.get(i).get("day_pnl") > 0) currentStreak++; else break;
                }
            } else if (lastPnl < 0) {
                for (int i = dayData.size() - 1; i >= 0; i--) {
                    if ((double) dayData.get(i).get("day_pnl") < 0) currentStreak--; else break;
                }
            }
        }
        
        List<Object> heatmap = dayData.stream()
                .map(d -> Map.of("date", d.get("date"), "pnl", d.get("day_pnl")))
                .collect(Collectors.toList());
                
        // Compliance
        List<Trade> tradesDocs = trades.stream().filter(t -> t.getRuleChecklist() != null && !t.getRuleChecklist().isEmpty()).collect(Collectors.toList());
        Map<String, long[]> compMap = new HashMap<>();
        for (Trade t : tradesDocs) {
            long[] counts = compMap.computeIfAbsent(t.getDate(), k -> new long[]{0, 0});
            for (TradeRuleEntry r : t.getRuleChecklist()) {
                counts[0]++;
                if (r.isFollowed()) counts[1]++;
            }
        }
        
        List<Object> compliance = compMap.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> Map.of("date", e.getKey(), "score", e.getValue()[0] > 0 ? Math.round(((double) e.getValue()[1] / e.getValue()[0]) * 100) : 0))
                .collect(Collectors.toList());
                
        return Streaks.builder()
                .currentStreak(currentStreak)
                .maxWinStreak(maxWinStreak)
                .maxLossStreak(maxLossStreak)
                .heatmap(heatmap)
                .compliance(compliance)
                .build();
    }

    @Override
    public Risk getRisk(String userEmail, DateRangeFilterDto filter) {
        List<Trade> trades = getTrades(userEmail, filter);
        
        List<Trade> withSL = trades.stream().filter(t -> t.getStopLoss() > 0).collect(Collectors.toList());
        List<Trade> withTP = trades.stream().filter(t -> t.getTakeProfit() > 0).collect(Collectors.toList());
        
        List<Object> rrData = new ArrayList<>();
        for (Trade t : withSL) {
            double risk = Math.abs(t.getEntryPrice() - t.getStopLoss());
            double actualReward = "LONG".equals(t.getSide()) ? t.getExitPrice() - t.getEntryPrice() : t.getEntryPrice() - t.getExitPrice();
            double plannedReward = t.getTakeProfit() > 0 ? Math.abs(t.getTakeProfit() - t.getEntryPrice()) : 0;
            
            boolean hitTP = t.getTakeProfit() > 0 && (("LONG".equals(t.getSide()) && t.getExitPrice() >= t.getTakeProfit()) || ("SHORT".equals(t.getSide()) && t.getExitPrice() <= t.getTakeProfit()));
            boolean hitSL = ("LONG".equals(t.getSide()) && t.getExitPrice() <= t.getStopLoss()) || ("SHORT".equals(t.getSide()) && t.getExitPrice() >= t.getStopLoss());
            
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
        
        double cumPnl = 0, peak = 0;
        List<Object> drawdownCurve = new ArrayList<>();
        String lastDate = "";
        for (Trade t : trades) {
            cumPnl += t.getPnl();
            if (cumPnl > peak) peak = cumPnl;
            Map<String, Object> point = Map.of("date", t.getDate(), "cumPnl", cumPnl, "drawdown", peak - cumPnl, "peak", peak);
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
                .avgRR(avgRR)
                .tpHitRate(rrData.isEmpty() ? 0 : ((double) tpHits / rrData.size() * 100))
                .slHitRate(rrData.isEmpty() ? 0 : ((double) slHits / rrData.size() * 100))
                .rrData(rrData)
                .drawdownCurve(drawdownCurve)
                .build();
    }

    @Override
    public List<Mood> getByMood(String userEmail, DateRangeFilterDto filter) {
        List<JournalEntry> journals = journalEntryRepository.findJournalsWithFilter(userEmail, filter);
        Map<String, String> journalMap = journals.stream().collect(Collectors.toMap(JournalEntry::getDate, JournalEntry::getMood));
        if (journalMap.isEmpty()) return new ArrayList<>();
        
        List<Trade> trades = tradeRepository.findTradesByDates(userEmail, journalMap.keySet());
        trades.forEach(t -> t.setPnl(t.getPnl() - t.getFees()));
        
        Map<String, Mood> moodMap = new HashMap<>();
        Map<String, double[]> dateGroups = new HashMap<>(); // [pnl, count, wins]
        Map<String, String> dateMood = new HashMap<>();
        
        for (Trade t : trades) {
            String mood = journalMap.getOrDefault(t.getDate(), "neutral");
            dateMood.put(t.getDate(), mood);
            double[] group = dateGroups.computeIfAbsent(t.getDate(), k -> new double[]{0, 0, 0});
            group[0] += t.getPnl();
            group[1]++;
            if (t.getPnl() > 0) group[2]++;
        }
        
        for (Map.Entry<String, double[]> e : dateGroups.entrySet()) {
            String mood = dateMood.get(e.getKey());
            Mood m = moodMap.computeIfAbsent(mood, k -> Mood.builder().mood(mood).build());
            m.setDays(m.getDays() + 1);
            m.setTotalPnl(m.getTotalPnl() + e.getValue()[0]);
            m.setTotalTrades(m.getTotalTrades() + (int) e.getValue()[1]);
            // Re-using a hacky way to store wins temporarily in winRate field
            m.setWinRate(m.getWinRate() + e.getValue()[2]); 
        }
        
        return moodMap.values().stream().map(m -> {
            m.setAvgPnlPerDay(m.getDays() > 0 ? m.getTotalPnl() / m.getDays() : 0);
            double wins = m.getWinRate();
            m.setWinRate(m.getTotalTrades() > 0 ? (wins / m.getTotalTrades() * 100) : 0);
            return m;
        }).collect(Collectors.toList());
    }

    @Override
    public List<Map<String, Object>> getRolling(String userEmail, int window) {
        List<Trade> trades = tradeRepository.findByUserEmailOrderByDateDesc(userEmail);
        Collections.reverse(trades); // Ascending
        trades.forEach(t -> t.setPnl(t.getPnl() - t.getFees()));
        
        Map<String, Double> dayMap = new TreeMap<>();
        for (Trade t : trades) {
            dayMap.put(t.getDate(), dayMap.getOrDefault(t.getDate(), 0.0) + t.getPnl());
        }
        
        List<Map.Entry<String, Double>> days = new ArrayList<>(dayMap.entrySet());
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (int i = 0; i < days.size(); i++) {
            int start = Math.max(0, i - window + 1);
            List<Map.Entry<String, Double>> windowDays = days.subList(start, i + 1);
            double totalPnl = windowDays.stream().mapToDouble(Map.Entry::getValue).sum();
            double avgPnl = totalPnl / windowDays.size();
            
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

    @KafkaListener(topics = KafkaConfig.TRADING_EVENTS_TOPIC, groupId = "trading-journal-group")
    @CacheEvict(value = "analytics", allEntries = true)
    public void handleTradeCreated(TradeCreatedEvent event) {
        log.info("Received TradeCreatedEvent for tradeId: {} user: {}. Invalidating analytics cache.", event.getTradeId(), event.getUserId());
    }
}
