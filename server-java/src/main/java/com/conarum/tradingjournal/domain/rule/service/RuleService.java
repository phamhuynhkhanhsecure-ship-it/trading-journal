package com.conarum.tradingjournal.domain.rule.service;

import com.conarum.tradingjournal.domain.rule.dto.RuleRequestDto;
import com.conarum.tradingjournal.domain.rule.dto.RuleResponseDto;

import java.util.List;

public interface RuleService {
    List<RuleResponseDto> getAllRules(String userEmail);
    List<RuleResponseDto> getActiveRules(String userEmail);
    RuleResponseDto createRule(RuleRequestDto request, String userEmail);
    RuleResponseDto updateRule(String id, RuleRequestDto request, String userEmail);
    void deleteRule(String id, String userEmail);
}
