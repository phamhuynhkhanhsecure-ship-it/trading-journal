package com.conarum.tradingjournal.domain.journal.controller;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import com.conarum.tradingjournal.config.SecurityUtils;
import com.conarum.tradingjournal.domain.journal.dto.JournalEntryRequestDto;
import com.conarum.tradingjournal.domain.journal.dto.JournalEntryResponseDto;
import com.conarum.tradingjournal.domain.journal.service.JournalEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/journal")
@RequiredArgsConstructor
public class JournalEntryController {

    private final JournalEntryService journalEntryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<JournalEntryResponseDto>>> getAllJournalEntries() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<JournalEntryResponseDto> entries = journalEntryService.getAllJournalEntries(userEmail);
        return ResponseEntity.ok(ApiResponse.success(entries));
    }

    @GetMapping("/{date:\\d{4}-\\d{2}-\\d{2}}")
    public ResponseEntity<ApiResponse<JournalEntryResponseDto>> getJournalEntryByDate(@PathVariable String date) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        JournalEntryResponseDto entry = journalEntryService.getJournalEntryByDate(date, userEmail);
        return ResponseEntity.ok(ApiResponse.success(entry));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<JournalEntryResponseDto>> createJournalEntry(@Valid @RequestBody JournalEntryRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        JournalEntryResponseDto entry = journalEntryService.createJournalEntry(request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(entry));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<JournalEntryResponseDto>> updateJournalEntry(
            @PathVariable String id, 
            @Valid @RequestBody JournalEntryRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        JournalEntryResponseDto entry = journalEntryService.updateJournalEntry(id, request, userEmail);
        return ResponseEntity.ok(ApiResponse.success(entry));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteJournalEntry(@PathVariable String id) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        journalEntryService.deleteJournalEntry(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
