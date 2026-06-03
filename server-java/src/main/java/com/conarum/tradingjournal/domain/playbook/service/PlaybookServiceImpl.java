package com.conarum.tradingjournal.domain.playbook.service;

import com.conarum.tradingjournal.common.exception.ResourceNotFoundException;
import com.conarum.tradingjournal.domain.playbook.dto.PlaybookRequestDto;
import com.conarum.tradingjournal.domain.playbook.dto.PlaybookResponseDto;
import com.conarum.tradingjournal.domain.playbook.mapper.PlaybookMapper;
import com.conarum.tradingjournal.domain.playbook.model.Playbook;
import com.conarum.tradingjournal.domain.playbook.repository.PlaybookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;

@Service
@RequiredArgsConstructor
public class PlaybookServiceImpl implements PlaybookService {

    private final PlaybookRepository playbookRepository;
    private final PlaybookMapper playbookMapper;
    private final TradeRepository tradeRepository;

    private PlaybookResponseDto enrichWithStats(PlaybookResponseDto dto, String userEmail) {
        List<Trade> trades = tradeRepository.findByPlaybookIdAndUserEmail(dto.getId(), userEmail);
        int total = trades.size();
        int wins = (int) trades.stream().filter(t -> t.getPnl().compareTo(java.math.BigDecimal.ZERO) > 0).count();
        double totalPnl = trades.stream().mapToDouble(t -> t.getPnl().doubleValue()).sum();
        
        dto.setTradeCount(total);
        dto.setWinCount(wins);
        dto.setTotalPnl(totalPnl);
        dto.setAvgPnl(total > 0 ? totalPnl / total : 0);
        dto.setWinRate(total > 0 ? ((double) wins / total * 100) : 0);
        
        return dto;
    }

    @Override
    public List<PlaybookResponseDto> getAllPlaybooks(String userEmail) {
        return playbookMapper.toDtoList(playbookRepository.findByUserEmailOrderBySortOrderAsc(userEmail))
                .stream()
                .map(dto -> enrichWithStats(dto, userEmail))
                .collect(Collectors.toList());
    }

    @Override
    public List<PlaybookResponseDto> getActivePlaybooks(String userEmail) {
        return playbookMapper.toDtoList(playbookRepository.findByUserEmailAndIsActiveTrueOrderBySortOrderAsc(userEmail))
                .stream()
                .map(dto -> enrichWithStats(dto, userEmail))
                .collect(Collectors.toList());
    }

    @Override
    public PlaybookResponseDto createPlaybook(PlaybookRequestDto request, String userEmail) {
        Playbook playbook = playbookMapper.toEntity(request);
        playbook.setUserEmail(userEmail);
        playbook.prePersist();
        
        Playbook savedPlaybook = playbookRepository.save(playbook);
        return enrichWithStats(playbookMapper.toDto(savedPlaybook), userEmail);
    }

    @Override
    public PlaybookResponseDto updatePlaybook(String id, PlaybookRequestDto request, String userEmail) {
        Playbook playbook = playbookRepository.findById(id)
                .filter(p -> p.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Playbook", "id", id));
                
        playbookMapper.updateEntityFromDto(request, playbook);
        playbook.preUpdate();
        
        Playbook updatedPlaybook = playbookRepository.save(playbook);
        return enrichWithStats(playbookMapper.toDto(updatedPlaybook), userEmail);
    }

    @Override
    public PlaybookResponseDto getPlaybookById(String id, String userEmail) {
        Playbook playbook = playbookRepository.findById(id)
                .filter(p -> p.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Playbook", "id", id));
        return enrichWithStats(playbookMapper.toDto(playbook), userEmail);
    }

    @Override
    public void deletePlaybook(String id, String userEmail) {
        Playbook playbook = playbookRepository.findById(id)
                .filter(p -> p.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Playbook", "id", id));
                
        playbookRepository.delete(playbook);
    }
}
