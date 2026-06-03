package com.conarum.tradingjournal.domain.analytics.service;

import com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.Mood;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.journal.model.JournalEntry;
import com.conarum.tradingjournal.domain.journal.repository.JournalEntryRepository;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsMoodService {

    private final TradeRepository tradeRepository;
    private final JournalEntryRepository journalEntryRepository;

    public List<Mood> getByMood(String userEmail, DateRangeFilterDto filter) {
        List<JournalEntry> journals = journalEntryRepository.findJournalsWithFilter(userEmail, filter);
        Map<String, String> journalMap = journals.stream().collect(Collectors.toMap(JournalEntry::getDate, JournalEntry::getMood));
        if (journalMap.isEmpty()) return new ArrayList<>();
        
        List<Trade> trades = tradeRepository.findTradesByDates(userEmail, journalMap.keySet());
        trades.forEach(t -> t.setPnl(t.getPnl().subtract(t.getFees() != null ? t.getFees() : BigDecimal.ZERO)));
        
        Map<String, Mood> moodMap = new HashMap<>();
        Map<String, Object[]> dateGroups = new HashMap<>(); // [pnl (BigDecimal), count (Integer), wins (Integer)]
        Map<String, String> dateMood = new HashMap<>();
        
        for (Trade t : trades) {
            String mood = journalMap.getOrDefault(t.getDate(), "neutral");
            dateMood.put(t.getDate(), mood);
            Object[] group = dateGroups.computeIfAbsent(t.getDate(), k -> new Object[]{BigDecimal.ZERO, 0, 0});
            group[0] = ((BigDecimal) group[0]).add(t.getPnl());
            group[1] = (Integer) group[1] + 1;
            if (t.getPnl().compareTo(BigDecimal.ZERO) > 0) {
                group[2] = (Integer) group[2] + 1;
            }
        }
        
        Map<String, Integer> moodWins = new HashMap<>();
        
        for (Map.Entry<String, Object[]> e : dateGroups.entrySet()) {
            String mood = dateMood.get(e.getKey());
            Mood m = moodMap.computeIfAbsent(mood, k -> Mood.builder().mood(mood).totalPnl(BigDecimal.ZERO).build());
            m.setDays(m.getDays() + 1);
            m.setTotalPnl(m.getTotalPnl().add((BigDecimal) e.getValue()[0]));
            m.setTotalTrades(m.getTotalTrades() + (Integer) e.getValue()[1]);
            
            moodWins.put(mood, moodWins.getOrDefault(mood, 0) + (Integer) e.getValue()[2]);
        }
        
        return moodMap.values().stream().map(m -> {
            m.setAvgPnlPerDay(m.getDays() > 0 ? m.getTotalPnl().divide(BigDecimal.valueOf(m.getDays()), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
            int wins = moodWins.getOrDefault(m.getMood(), 0);
            m.setWinRate(m.getTotalTrades() > 0 ? BigDecimal.valueOf((double) wins / m.getTotalTrades() * 100) : BigDecimal.ZERO);
            return m;
        }).collect(Collectors.toList());
    }
}
