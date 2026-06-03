package com.conarum.tradingjournal.domain.trade.controller;

import com.conarum.tradingjournal.common.dto.ApiResponse;
import com.conarum.tradingjournal.config.SecurityUtils;
import com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeRequestDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeResponseDto;
import com.conarum.tradingjournal.domain.trade.service.TradeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TradeResponseDto>>> getAllTrades(
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String instrument,
            @RequestParam(required = false) String side,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) java.math.BigDecimal pnlMin,
            @RequestParam(required = false) java.math.BigDecimal pnlMax,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String playbookId,
            @RequestParam(required = false) Integer rating) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        
        TradeFilterDto filter = new TradeFilterDto();
        filter.setYear(year != null ? Integer.parseInt(year) : null);
        filter.setMonth(month != null ? Integer.parseInt(month) : null);
        filter.setInstrument(instrument);
        filter.setSide(side);
        filter.setTag(tag);
        filter.setDateFrom(dateFrom);
        filter.setDateTo(dateTo);
        filter.setPnlMin(pnlMin);
        filter.setPnlMax(pnlMax);
        filter.setSearch(search);
        filter.setPlaybookId(playbookId);
        filter.setRating(rating);
        
        List<TradeResponseDto> trades = tradeService.getAllTrades(filter, userEmail);
        return ResponseEntity.ok(ApiResponse.success(trades));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TradeResponseDto>> getTradeById(@PathVariable String id) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        TradeResponseDto trade = tradeService.getTradeById(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success(trade));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TradeResponseDto>> createTrade(@Valid @RequestBody TradeRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        TradeResponseDto trade = tradeService.createTrade(request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(trade));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TradeResponseDto>> updateTrade(
            @PathVariable String id, 
            @Valid @RequestBody TradeRequestDto request) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        TradeResponseDto trade = tradeService.updateTrade(id, request, userEmail);
        return ResponseEntity.ok(ApiResponse.success(trade));
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<TradeResponseDto>>> bulkCreateTrades(@Valid @RequestBody List<TradeRequestDto> requests) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<TradeResponseDto> trades = tradeService.bulkCreateTrades(requests, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(trades));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTrade(@PathVariable String id) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        tradeService.deleteTrade(id, userEmail);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping(value = "/{id}/images", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<List<TradeResponseDto>>> uploadImages(
            @PathVariable String id,
            @RequestParam("images") List<MultipartFile> files) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<TradeResponseDto> result = tradeService.uploadImages(id, files, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(result));
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<ApiResponse<TradeResponseDto>> deleteImage(
            @PathVariable String id,
            @PathVariable String imageId) {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        TradeResponseDto trade = tradeService.deleteImage(id, imageId, userEmail);
        return ResponseEntity.ok(ApiResponse.success(trade));
    }

    @GetMapping("/gallery/all")
    public ResponseEntity<ApiResponse<List<com.conarum.tradingjournal.domain.trade.dto.GalleryItemDto>>> getGallery() {
        String userEmail = SecurityUtils.getCurrentUserEmail();
        List<com.conarum.tradingjournal.domain.trade.dto.GalleryItemDto> gallery = tradeService.getGallery(userEmail);
        return ResponseEntity.ok(ApiResponse.success(gallery));
    }
}
