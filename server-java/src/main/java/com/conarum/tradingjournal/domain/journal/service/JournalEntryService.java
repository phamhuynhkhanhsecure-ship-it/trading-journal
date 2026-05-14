package com.conarum.tradingjournal.domain.journal.service;

import com.conarum.tradingjournal.domain.journal.dto.JournalEntryRequestDto;
import com.conarum.tradingjournal.domain.journal.dto.JournalEntryResponseDto;

import java.util.List;

public interface JournalEntryService {
    List<JournalEntryResponseDto> getAllJournalEntries(String userEmail);
    JournalEntryResponseDto getJournalEntryByDate(String date, String userEmail);
    JournalEntryResponseDto createJournalEntry(JournalEntryRequestDto request, String userEmail);
    JournalEntryResponseDto updateJournalEntry(String id, JournalEntryRequestDto request, String userEmail);
    void deleteJournalEntry(String id, String userEmail);
}
