package com.conarum.tradingjournal.domain.journal.repository;

import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.journal.model.JournalEntry;
import java.util.List;

public interface JournalEntryCustomRepository {
    List<JournalEntry> findJournalsWithFilter(String userEmail, DateRangeFilterDto filter);
}
