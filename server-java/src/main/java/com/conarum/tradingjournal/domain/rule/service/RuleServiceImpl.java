package com.conarum.tradingjournal.domain.rule.service;

import com.conarum.tradingjournal.common.exception.ResourceNotFoundException;
import com.conarum.tradingjournal.domain.rule.dto.RuleRequestDto;
import com.conarum.tradingjournal.domain.rule.dto.RuleResponseDto;
import com.conarum.tradingjournal.domain.rule.mapper.RuleMapper;
import com.conarum.tradingjournal.domain.rule.model.Rule;
import com.conarum.tradingjournal.domain.rule.repository.RuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RuleServiceImpl implements RuleService {

    private final RuleRepository ruleRepository;
    private final RuleMapper ruleMapper;

    @Override
    public List<RuleResponseDto> getAllRules(String userEmail) {
        return ruleMapper.toDtoList(ruleRepository.findByUserEmailOrderBySortOrderAsc(userEmail));
    }

    @Override
    public List<RuleResponseDto> getActiveRules(String userEmail) {
        return ruleMapper.toDtoList(ruleRepository.findByUserEmailAndIsActiveTrueOrderBySortOrderAsc(userEmail));
    }

    @Override
    public RuleResponseDto createRule(RuleRequestDto request, String userEmail) {
        Rule rule = ruleMapper.toEntity(request);
        rule.setUserEmail(userEmail);
        rule.prePersist();
        
        Rule savedRule = ruleRepository.save(rule);
        return ruleMapper.toDto(savedRule);
    }

    @Override
    public RuleResponseDto updateRule(String id, RuleRequestDto request, String userEmail) {
        Rule rule = ruleRepository.findById(id)
                .filter(r -> r.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", id));
                
        ruleMapper.updateEntityFromDto(request, rule);
        rule.preUpdate();
        
        Rule updatedRule = ruleRepository.save(rule);
        return ruleMapper.toDto(updatedRule);
    }

    @Override
    public void deleteRule(String id, String userEmail) {
        Rule rule = ruleRepository.findById(id)
                .filter(r -> r.getUserEmail().equals(userEmail))
                .orElseThrow(() -> new ResourceNotFoundException("Rule", "id", id));
                
        ruleRepository.delete(rule);
    }
}
