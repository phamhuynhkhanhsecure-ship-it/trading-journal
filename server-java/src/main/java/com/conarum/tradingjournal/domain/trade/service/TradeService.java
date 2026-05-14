package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeRequestDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TradeService {
    List<TradeResponseDto> getAllTrades(TradeFilterDto filter, String userEmail);
    TradeResponseDto getTradeById(String id, String userEmail);
    TradeResponseDto createTrade(TradeRequestDto request, String userEmail);
    List<TradeResponseDto> bulkCreateTrades(List<TradeRequestDto> requests, String userEmail);
    TradeResponseDto updateTrade(String id, TradeRequestDto request, String userEmail);
    void deleteTrade(String id, String userEmail);
    
    // Image handling
    List<TradeResponseDto> uploadImages(String tradeId, List<MultipartFile> files, String userEmail);
    TradeResponseDto deleteImage(String tradeId, String imageId, String userEmail);
    List<Object> getGallery(String userEmail);
}
