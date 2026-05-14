package com.conarum.tradingjournal.domain.rule.controller;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import com.conarum.tradingjournal.config.SecurityUtils;
import com.conarum.tradingjournal.domain.rule.dto.RuleRequestDto;
import com.conarum.tradingjournal.domain.rule.dto.RuleResponseDto;
import com.conarum.tradingjournal.domain.rule.service.RuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class RuleController {

    private final RuleService ruleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RuleResponseDto>>> getAllRules() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<RuleResponseDto> rules = ruleService.getAllRules(userEmail);
        return ResponseEntity.ok(ApiResponse.success(rules));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<RuleResponseDto>>> getActiveRules() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<RuleResponseDto> rules = ruleService.getActiveRules(userEmail);
        return ResponseEntity.ok(ApiResponse.success(rules));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RuleResponseDto>> createRule(@Valid @RequestBody RuleRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        RuleResponseDto rule = ruleService.createRule(request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(rule));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RuleResponseDto>> updateRule(
            @PathVariable String id, 
            @Valid @RequestBody RuleRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        RuleResponseDto rule = ruleService.updateRule(id, request, userEmail);
        return ResponseEntity.ok(ApiResponse.success(rule));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(@PathVariable String id) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        ruleService.deleteRule(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
