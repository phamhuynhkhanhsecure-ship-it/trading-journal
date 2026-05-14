package com.conarum.tradingjournal.domain.export.service;

import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;

public interface ExportService {
    byte[] exportAnalyticsToExcel(String userEmail, DateRangeFilterDto filter);
}
