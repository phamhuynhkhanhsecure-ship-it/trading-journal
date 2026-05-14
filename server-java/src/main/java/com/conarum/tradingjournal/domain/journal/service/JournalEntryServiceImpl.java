package com.conarum.tradingjournal.domain.journal.service;

import com.conarum.tradingjournal.common.exception.ResourceNotFoundException;
import com.conarum.tradingjournal.domain.journal.dto.JournalEntryRequestDto;
import com.conarum.tradingjournal.domain.journal.dto.JournalEntryResponseDto;
import com.conarum.tradingjournal.domain.journal.mapper.JournalEntryMapper;
import com.conarum.tradingjournal.domain.journal.model.JournalEntry;
import com.conarum.tradingjournal.domain.journal.repository.JournalEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class JournalEntryServiceImpl implements JournalEntryService {

    private final JournalEntryRepository journalEntryRepository;
    private final JournalEntryMapper journalEntryMapper;

    @Override
    public List<JournalEntryResponseDto> getAllJournalEntries(String userEmail) {
        return journalEntryMapper.toDtoList(journalEntryRepository.findByUserEmailOrderByDateDesc(userEmail));
    }

    @Override
    public JournalEntryResponseDto getJournalEntryByDate(String date, String userEmail) {
        return journalEntryRepository.findByDateAndUserEmail(date, userEmail)
                .map(journalEntryMapper::toDto)
                .orElse(null);
    }

    @Override
    public JournalEntryResponseDto createJournalEntry(JournalEntryRequestDto request, String userEmail) {
        Optional<JournalEntry> existingOpt = journalEntryRepository.findByDateAndUserEmail(request.getDate(), userEmail);
        
        JournalEntry entry;
        if (existingOpt.isPresent()) {
            entry = existingOpt.get();
            journalEntryMapper.updateEntityFromDto(request, entry);
            entry.preUpdate();
        } else {
            entry = journalEntryMapper.toEntity(request);
            entry.setUserEmail(userEmail);
            entry.prePersist();
        }
        
        JournalEntry savedEntry = journalEntryRepository.save(entry);
        return journalEntryMapper.toDto(savedEntry);
    }

    @Override
    public JournalEntryResponseDto updateJournalEntry(String id, JournalEntryRequestDto request, String userEmail) {
        JournalEntry entry = journalEntryRepository.findById(id)
                .filter(e -> e.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("JournalEntry", "id", id));
                
        // Check duplicate date if changed
        if (!entry.getDate().equals(request.getDate())) {
            Optional<JournalEntry> existing = journalEntryRepository.findByDateAndUserEmail(request.getDate(), userEmail);
            if (existing.isPresent()) {
                throw new IllegalArgumentException("JournalEntry for date '" + request.getDate() + "' already exists");
            }
        }
                
        journalEntryMapper.updateEntityFromDto(request, entry);
        entry.preUpdate();
        
        JournalEntry updatedEntry = journalEntryRepository.save(entry);
        return journalEntryMapper.toDto(updatedEntry);
    }

    @Override
    public void deleteJournalEntry(String id, String userEmail) {
        JournalEntry entry = journalEntryRepository.findById(id)
                .filter(e -> e.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("JournalEntry", "id", id));
                
        journalEntryRepository.delete(entry);
    }
}
