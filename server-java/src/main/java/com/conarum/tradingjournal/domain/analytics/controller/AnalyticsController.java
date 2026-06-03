package com.conarum.tradingjournal.domain.analytics.controller;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import com.conarum.tradingjournal.config.SecurityUtils;
import com.conarum.tradingjournal.domain.analytics.dto.AnalyticsResponseDto.*;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.analytics.service.AnalyticsOverviewService;
import com.conarum.tradingjournal.domain.analytics.service.AnalyticsPerformanceService;
import com.conarum.tradingjournal.domain.analytics.service.AnalyticsRiskService;
import com.conarum.tradingjournal.domain.analytics.service.AnalyticsMoodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsOverviewService overviewService;
    private final AnalyticsPerformanceService performanceService;
    private final AnalyticsRiskService riskService;
    private final AnalyticsMoodService moodService;

    private DateRangeFilterDto createFilter(String dateFrom, String dateTo) {
        DateRangeFilterDto filter = new DateRangeFilterDto();
        filter.setDateFrom(dateFrom);
        filter.setDateTo(dateTo);
        return filter;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Overview>> getOverview(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        log.info("RECEIVED REQUEST: /api/analytics/overview from={}, to={}", dateFrom, dateTo);
        String userEmail = SecurityUtils.getCurrentUserEmail();
        Overview data = overviewService.getOverview(userEmail, createFilter(dateFrom, dateTo));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/by-day-of-week")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getByDayOfWeek(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<ByCategory> data = performanceService.getByDayOfWeek(userEmail, createFilter(dateFrom, dateTo));
        List<Map<String, Object>> mapped = data.stream().map(d -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("day", d.getCategory());
            map.put("dayIndex", d.getDayIndex());
            map.put("trades", d.getTrades());
            map.put("pnl", d.getPnl());
            map.put("winRate", d.getWinRate());
            map.put("avgPnl", d.getAvgPnl());
            return map;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(mapped));
    }

    @GetMapping("/by-instrument")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getByInstrument(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<ByCategory> data = performanceService.getByInstrument(userEmail, createFilter(dateFrom, dateTo));
        List<Map<String, Object>> mapped = data.stream().map(d -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("instrument", d.getCategory());
            map.put("trades", d.getTrades());
            map.put("pnl", d.getPnl());
            map.put("winRate", d.getWinRate());
            map.put("avgPnl", d.getAvgPnl());
            return map;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(mapped));
    }

    @GetMapping("/by-side")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBySide(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<ByCategory> data = performanceService.getBySide(userEmail, createFilter(dateFrom, dateTo));
        List<Map<String, Object>> mapped = data.stream().map(d -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("side", d.getCategory());
            map.put("trades", d.getTrades());
            map.put("pnl", d.getPnl());
            map.put("winRate", d.getWinRate());
            map.put("avgPnl", d.getAvgPnl());
            return map;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(mapped));
    }

    @GetMapping("/by-tag")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getByTag(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<ByCategory> data = performanceService.getByTag(userEmail, createFilter(dateFrom, dateTo));
        List<Map<String, Object>> mapped = data.stream().map(d -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("tag", d.getCategory());
            map.put("trades", d.getTrades());
            map.put("pnl", d.getPnl());
            map.put("winRate", d.getWinRate());
            map.put("avgPnl", d.getAvgPnl());
            return map;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(mapped));
    }

    @GetMapping("/by-playbook")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getByPlaybook(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<ByCategory> data = performanceService.getByPlaybook(userEmail, createFilter(dateFrom, dateTo));
        List<Map<String, Object>> mapped = data.stream().map(d -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("playbookId", d.getCategory());
            map.put("name", d.getName() != null ? d.getName() : d.getCategory());
            map.put("color", d.getColor() != null ? d.getColor() : "#58a6ff");
            map.put("trades", d.getTrades());
            map.put("pnl", d.getPnl());
            map.put("winRate", d.getWinRate());
            map.put("avgPnl", d.getAvgPnl());
            return map;
        }).toList();
        return ResponseEntity.ok(ApiResponse.success(mapped));
    }

    @GetMapping("/streaks")
    public ResponseEntity<ApiResponse<Streaks>> getStreaks(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        Streaks data = performanceService.getStreaks(userEmail, createFilter(dateFrom, dateTo));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/risk")
    public ResponseEntity<ApiResponse<Risk>> getRisk(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        Risk data = riskService.getRisk(userEmail, createFilter(dateFrom, dateTo));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/by-mood")
    public ResponseEntity<ApiResponse<List<Mood>>> getByMood(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<Mood> data = moodService.getByMood(userEmail, createFilter(dateFrom, dateTo));
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/rolling")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRolling(
            @RequestParam(defaultValue = "10") int window) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<Map<String, Object>> data = performanceService.getRolling(userEmail, window);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
