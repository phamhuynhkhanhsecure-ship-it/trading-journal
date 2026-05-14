package com.conarum.tradingjournal.domain.trade.repository;

import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import java.util.List;
import java.util.Set;

public interface TradeCustomRepository {
    List<Trade> findTradesWithFilter(String userEmail, DateRangeFilterDto filter);
    List<Trade> findTradesByDates(String userEmail, Set<String> dates);
    List<Trade> findTradesByTradeFilter(String userEmail, TradeFilterDto filter);
}
