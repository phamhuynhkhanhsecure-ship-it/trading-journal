package com.conarum.tradingjournal.domain.analytics.service;

import com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.*;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;

import java.util.List;
import java.util.Map;

public interface AnalyticsService {
    Overview getOverview(String userEmail, DateRangeFilterDto filter);
    List<ByCategory> getByDayOfWeek(String userEmail, DateRangeFilterDto filter);
    List<ByCategory> getByInstrument(String userEmail, DateRangeFilterDto filter);
    List<ByCategory> getBySide(String userEmail, DateRangeFilterDto filter);
    List<ByCategory> getByTag(String userEmail, DateRangeFilterDto filter);
    List<ByCategory> getByPlaybook(String userEmail, DateRangeFilterDto filter);
    Streaks getStreaks(String userEmail, DateRangeFilterDto filter);
    Risk getRisk(String userEmail, DateRangeFilterDto filter);
    List<Mood> getByMood(String userEmail, DateRangeFilterDto filter);
    List<Map<String, Object>> getRolling(String userEmail, int window);
}
