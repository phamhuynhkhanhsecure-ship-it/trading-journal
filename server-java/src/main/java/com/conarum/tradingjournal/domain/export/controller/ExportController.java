package com.conarum.tradingjournal.domain.export.controller;

import com.conarum.tradingjournal.config.SecurityUtils;
import com.conarum.tradingjournal.domain.analytics.dto.DateRangeFilterDto;
import com.conarum.tradingjournal.domain.export.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAnalytics(
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "excel") String format) {
            
        String userEmail = SecurityUtils.getCurrentUserEmail();
        DateRangeFilterDto filter = new DateRangeFilterDto();
        filter.setDateFrom(dateFrom);
        filter.setDateTo(dateTo);

        byte[] excelBytes = exportService.exportAnalyticsToExcel(userEmail, filter);
        
        String filename = "trading-journal-analytics.xlsx";
        if (dateFrom != null && dateTo != null) {
            filename = "trading-journal-analytics_" + dateFrom + "_to_" + dateTo + ".xlsx";
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }
}
