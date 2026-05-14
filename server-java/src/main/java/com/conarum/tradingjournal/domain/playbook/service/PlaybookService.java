package com.conarum.tradingjournal.domain.playbook.service;

import com.conarum.tradingjournal.domain.playbook.dto.PlaybookRequestDto;
import com.conarum.tradingjournal.domain.playbook.dto.PlaybookResponseDto;

import java.util.List;

public interface PlaybookService {
    List<PlaybookResponseDto> getAllPlaybooks(String userEmail);
    List<PlaybookResponseDto> getActivePlaybooks(String userEmail);
    PlaybookResponseDto createPlaybook(PlaybookRequestDto request, String userEmail);
    PlaybookResponseDto updatePlaybook(String id, PlaybookRequestDto request, String userEmail);
    PlaybookResponseDto getPlaybookById(String id, String userEmail);
    void deletePlaybook(String id, String userEmail);
}
