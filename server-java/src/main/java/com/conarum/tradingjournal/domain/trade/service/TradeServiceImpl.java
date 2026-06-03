package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.common.exception.ResourceNotFoundException;
import com.conarum.tradingjournal.domain.rule.model.Rule;
import com.conarum.tradingjournal.domain.rule.repository.RuleRepository;
import com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeRequestDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeResponseDto;
import com.conarum.tradingjournal.domain.trade.mapper.TradeMapper;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeRuleEntry;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import com.conarum.tradingjournal.common.event.TradeCreatedEvent;
import com.conarum.tradingjournal.config.KafkaConfig;
import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TradeServiceImpl implements TradeService {

    private final TradeRepository tradeRepository;
    private final RuleRepository ruleRepository;
    private final TradeMapper tradeMapper;
    private final GoogleDriveService googleDriveService;
    private final TradeOutboxEventRepository tradeOutboxEventRepository;
    private final ObjectMapper objectMapper;

    @Override
    public List<TradeResponseDto> getAllTrades(TradeFilterDto filter, String userEmail) {
        List<Trade> trades = tradeRepository.findTradesByTradeFilter(userEmail, filter);
        return tradeMapper.toDtoList(trades);
    }

    @Override
    public TradeResponseDto getTradeById(String id, String userEmail) {
        Trade trade = tradeRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trade not found"));
        return tradeMapper.toDto(trade);
    }

    @Override
    public TradeResponseDto createTrade(TradeRequestDto request, String userEmail) {
        Trade trade = tradeMapper.toEntity(request);
        trade.setUserEmail(userEmail);
        
        if (request.getRuleChecklist() != null && !request.getRuleChecklist().isEmpty()) {
            for (TradeRuleEntry entry : trade.getRuleChecklist()) {
                if (entry.getRuleId() == null && entry.getRuleName() != null) {
                    Rule newRule = new Rule();
                    newRule.setName(entry.getRuleName());
                    newRule.setUserEmail(userEmail);
                    newRule.setCategory("Uncategorized");
                    newRule = ruleRepository.save(newRule);
                    entry.setRuleId(newRule.getId());
                }
            }
        }
        
        Trade savedTrade = tradeRepository.save(trade);
        
        TradeCreatedEvent event = TradeCreatedEvent.builder()
                .tradeId(savedTrade.getId())
                .userId(savedTrade.getUserEmail())
                .symbol(savedTrade.getInstrument())
                .action(savedTrade.getSide())
                .createdAt(java.time.LocalDateTime.now())
                .build();
                
        try {
            TradeOutboxEvent outboxEvent = TradeOutboxEvent.builder()
                    .topic(KafkaConfig.TRADING_EVENTS_TOPIC)
                    .aggregateId(savedTrade.getId())
                    .eventType(TradeCreatedEvent.class.getSimpleName())
                    .payload(objectMapper.writeValueAsString(event))
                    .status("PENDING")
                    .createdAt(Instant.now())
                    .build();
            tradeOutboxEventRepository.save(outboxEvent);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize TradeCreatedEvent for outbox", e);
        }
        
        return tradeMapper.toDto(savedTrade);
    }

    @Override
    public TradeResponseDto updateTrade(String id, TradeRequestDto request, String userEmail) {
        Trade existingTrade = tradeRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trade not found"));
        
        tradeMapper.updateEntityFromDto(request, existingTrade);
        
        if (request.getRuleChecklist() != null && !request.getRuleChecklist().isEmpty()) {
            for (TradeRuleEntry entry : existingTrade.getRuleChecklist()) {
                if (entry.getRuleId() == null && entry.getRuleName() != null) {
                    Rule newRule = new Rule();
                    newRule.setName(entry.getRuleName());
                    newRule.setUserEmail(userEmail);
                    newRule.setCategory("Uncategorized");
                    newRule = ruleRepository.save(newRule);
                    entry.setRuleId(newRule.getId());
                }
            }
        }

        Trade updatedTrade = tradeRepository.save(existingTrade);
        return tradeMapper.toDto(updatedTrade);
    }

    @Override
    public List<TradeResponseDto> bulkCreateTrades(List<TradeRequestDto> requests, String userEmail) {
        List<Trade> tradesToSave = new ArrayList<>();
        List<Rule> allRules = ruleRepository.findByUserEmail(userEmail);
        Map<String, String> ruleNameMap = allRules.stream().collect(Collectors.toMap(r -> r.getName().toLowerCase(), Rule::getId));

        for (TradeRequestDto request : requests) {
            Trade trade = tradeMapper.toEntity(request);
            trade.setUserEmail(userEmail);
            
            if (request.getRuleChecklist() != null && !request.getRuleChecklist().isEmpty()) {
                for (TradeRuleEntry entry : trade.getRuleChecklist()) {
                    if (entry.getRuleId() == null && entry.getRuleName() != null) {
                        String name = entry.getRuleName().toLowerCase();
                        if (ruleNameMap.containsKey(name)) {
                            entry.setRuleId(ruleNameMap.get(name));
                        } else {
                            Rule newRule = new Rule();
                            newRule.setName(entry.getRuleName());
                            newRule.setUserEmail(userEmail);
                            newRule.setCategory("Uncategorized");
                            newRule = ruleRepository.save(newRule);
                            ruleNameMap.put(name, newRule.getId());
                            entry.setRuleId(newRule.getId());
                        }
                    }
                }
            }
            tradesToSave.add(trade);
        }
        
        List<Trade> savedTrades = tradeRepository.saveAll(tradesToSave);
        return tradeMapper.toDtoList(savedTrades);
    }

    @Override
    public List<TradeResponseDto> uploadImages(String tradeId, List<MultipartFile> files, String userEmail) {
        Trade trade = tradeRepository.findByIdAndUserEmail(tradeId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trade not found"));

        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("No files uploaded");
        }

        if (trade.getImages() == null) {
            trade.setImages(new ArrayList<>());
        }

        if (trade.getImages().size() + files.size() > 10) {
            throw new IllegalArgumentException("Maximum 10 images per trade.");
        }

        int currentOrder = trade.getImages().size();
        for (MultipartFile file : files) {
            try {
                String originalName = file.getOriginalFilename();
                String ext = originalName != null && originalName.contains(".") ? originalName.substring(originalName.lastIndexOf(".")) : "";
                String uniqueName = java.util.UUID.randomUUID().toString() + ext;
                
                String driveFileId = googleDriveService.uploadFile(file, uniqueName);
                
                Trade.TradeImage img = new Trade.TradeImage();
                img.setId(java.util.UUID.randomUUID().toString());
                img.setFilename(uniqueName);
                img.setOriginalName(originalName);
                img.setMimeType(file.getContentType());
                img.setSize(file.getSize());
                img.setCaption("");
                img.setSortOrder(currentOrder++);
                img.setCreatedAt(java.time.Instant.now().toString());
                img.setDriveFileId(driveFileId); // Add driveFileId
                
                trade.getImages().add(img);
            } catch (Exception e) {
                e.printStackTrace();
                throw new RuntimeException("Upload to Google Drive failed", e);
            }
        }
        
        tradeRepository.save(trade);
        return tradeMapper.toDtoList(List.of(trade));
    }

    @Override
    public TradeResponseDto deleteImage(String tradeId, String imageId, String userEmail) {
        Trade trade = tradeRepository.findByIdAndUserEmail(tradeId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trade not found"));
                
        if (trade.getImages() != null) {
            Trade.TradeImage imgToRemove = trade.getImages().stream().filter(img -> img.getId().equals(imageId)).findFirst().orElse(null);
            if (imgToRemove != null) {
                if (imgToRemove.getDriveFileId() != null) {
                    googleDriveService.deleteFile(imgToRemove.getDriveFileId());
                } else {
                    java.io.File file = new java.io.File("../data/uploads", imgToRemove.getFilename());
                    if (file.exists()) {
                        file.delete();
                    }
                }
                trade.getImages().remove(imgToRemove);
                tradeRepository.save(trade);
            }
        }
        return tradeMapper.toDto(trade);
    }

    @Override
    public List<com.conarum.tradingjournal.domain.trade.dto.GalleryItemDto> getGallery(String userEmail) {
        List<Trade> trades = tradeRepository.findByUserEmailOrderByDateDesc(userEmail);
        List<com.conarum.tradingjournal.domain.trade.dto.GalleryItemDto> gallery = new ArrayList<>();
        
        for (Trade t : trades) {
            if (t.getImages() != null) {
                for (Trade.TradeImage img : t.getImages()) {
                    com.conarum.tradingjournal.domain.trade.dto.GalleryItemDto dto = com.conarum.tradingjournal.domain.trade.dto.GalleryItemDto.builder()
                        .tradeId(t.getId())
                        .date(t.getDate())
                        .instrument(t.getInstrument())
                        .pnl(t.getPnl())
                        .imageId(img.getId())
                        .filename(img.getFilename())
                        .caption(img.getCaption() != null ? img.getCaption() : "")
                        .mimeType(img.getMimeType())
                        .driveFileId(img.getDriveFileId() != null ? img.getDriveFileId() : "")
                        .build();
                    gallery.add(dto);
                }
            }
        }
        return gallery;
    }

    @Override
    public void deleteTrade(String id, String userEmail) {
        Trade trade = tradeRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trade not found"));
        tradeRepository.delete(trade);
    }
}
