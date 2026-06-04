package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.common.event.TradeCreatedEvent;
import com.conarum.tradingjournal.common.exception.ResourceNotFoundException;
import com.conarum.tradingjournal.common.metrics.TradingMetrics;
import com.conarum.tradingjournal.config.KafkaConfig;
import com.conarum.tradingjournal.domain.rule.model.Rule;
import com.conarum.tradingjournal.domain.rule.repository.RuleRepository;
import com.conarum.tradingjournal.domain.trade.dto.GalleryItemDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeRequestDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeResponseDto;
import com.conarum.tradingjournal.domain.trade.mapper.TradeMapper;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeImage;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeRuleEntry;
import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeServiceImpl implements TradeService {

    private final TradeRepository tradeRepository;
    private final RuleRepository ruleRepository;
    private final TradeMapper tradeMapper;
    private final GoogleDriveService googleDriveService;
    private final TradeOutboxEventRepository tradeOutboxEventRepository;
    private final ObjectMapper objectMapper;
    private final TradingMetrics tradingMetrics;

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
    @Transactional
    public TradeResponseDto createTrade(TradeRequestDto request, String userEmail) {
        Trade trade = tradeMapper.toEntity(request);
        trade.setUserEmail(userEmail);

        resolveRuleChecklist(trade.getRuleChecklist(), userEmail);

        Trade savedTrade = tradeRepository.save(trade);

        TradeCreatedEvent event = TradeCreatedEvent.builder()
                .tradeId(savedTrade.getId())
                .userId(savedTrade.getUserEmail())
                .symbol(savedTrade.getInstrument())
                .action(savedTrade.getSide())
                .createdAt(LocalDateTime.now())
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

        tradingMetrics.recordTradeCreated();
        return tradeMapper.toDto(savedTrade);
    }

    @Override
    public TradeResponseDto updateTrade(String id, TradeRequestDto request, String userEmail) {
        Trade existingTrade = tradeRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trade not found"));

        tradeMapper.updateEntityFromDto(request, existingTrade);
        resolveRuleChecklist(existingTrade.getRuleChecklist(), userEmail);

        Trade updatedTrade = tradeRepository.save(existingTrade);
        return tradeMapper.toDto(updatedTrade);
    }

    @Override
    public List<TradeResponseDto> bulkCreateTrades(List<TradeRequestDto> requests, String userEmail) {
        List<Rule> allRules = ruleRepository.findByUserEmail(userEmail);
        Map<String, String> ruleNameMap = allRules.stream()
                .collect(Collectors.toMap(r -> r.getName().toLowerCase(), Rule::getId));

        List<Trade> tradesToSave = new ArrayList<>();
        for (TradeRequestDto request : requests) {
            Trade trade = tradeMapper.toEntity(request);
            trade.setUserEmail(userEmail);

            if (request.getRuleChecklist() != null) {
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
                String ext = (originalName != null && originalName.contains("."))
                        ? originalName.substring(originalName.lastIndexOf(".")) : "";
                String uniqueName = UUID.randomUUID() + ext;

                String driveFileId = googleDriveService.uploadFile(file, uniqueName);

                TradeImage img = new TradeImage();
                img.setId(UUID.randomUUID().toString());
                img.setFilename(uniqueName);
                img.setOriginalName(originalName);
                img.setMimeType(file.getContentType());
                img.setSize(file.getSize());
                img.setCaption("");
                img.setSortOrder(currentOrder++);
                img.setCreatedAt(Instant.now().toString());
                img.setDriveFileId(driveFileId);

                trade.getImages().add(img);
            } catch (Exception e) {
                log.error("Failed to upload file '{}' to Google Drive for trade '{}'",
                        file.getOriginalFilename(), tradeId, e);
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
            trade.getImages().stream()
                    .filter(img -> img.getId().equals(imageId))
                    .findFirst()
                    .ifPresent(img -> {
                        if (img.getDriveFileId() != null && !img.getDriveFileId().isBlank()) {
                            googleDriveService.deleteFile(img.getDriveFileId());
                        } else {
                            log.warn("Image '{}' on trade '{}' has no driveFileId, skipping Drive delete",
                                    imageId, tradeId);
                        }
                        trade.getImages().remove(img);
                        tradeRepository.save(trade);
                    });
        }
        return tradeMapper.toDto(trade);
    }

    @Override
    public List<GalleryItemDto> getGallery(String userEmail) {
        List<Trade> trades = tradeRepository.findByUserEmailOrderByDateDesc(userEmail);
        List<GalleryItemDto> gallery = new ArrayList<>();

        for (Trade t : trades) {
            if (t.getImages() == null) continue;
            for (TradeImage img : t.getImages()) {
                gallery.add(GalleryItemDto.builder()
                        .id(img.getId())
                        .tradeId(t.getId())
                        .tradeDate(t.getDate())
                        .instrument(t.getInstrument())
                        .side(t.getSide())
                        .pnl(t.getPnl())
                        .filename(img.getFilename())
                        .originalName(img.getOriginalName())
                        .caption(img.getCaption() != null ? img.getCaption() : "")
                        .mimeType(img.getMimeType())
                        .driveFileId(img.getDriveFileId() != null ? img.getDriveFileId() : "")
                        .build());
            }
        }
        return gallery;
    }

    @Override
    @Transactional
    public void deleteTrade(String id, String userEmail) {
        Trade trade = tradeRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Trade not found"));

        // Delete all associated Drive images before removing the trade document
        if (trade.getImages() != null) {
            trade.getImages().forEach(img -> {
                if (img.getDriveFileId() != null && !img.getDriveFileId().isBlank()) {
                    try {
                        googleDriveService.deleteFile(img.getDriveFileId());
                    } catch (Exception e) {
                        log.warn("Failed to delete Drive file '{}' for trade '{}': {}",
                                img.getDriveFileId(), id, e.getMessage());
                        // Non-fatal: continue deleting remaining images and the trade itself
                    }
                }
            });
        }

        tradeRepository.delete(trade);
        tradingMetrics.recordTradeDeleted();
        log.info("Deleted trade '{}' and {} Drive image(s) for user '{}'",
                id, trade.getImages() != null ? trade.getImages().size() : 0, userEmail);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Resolves rule checklist entries that have a name but no ID,
     * creating new Rule documents as needed.
     */
    private void resolveRuleChecklist(List<TradeRuleEntry> checklist, String userEmail) {
        if (checklist == null || checklist.isEmpty()) return;

        for (TradeRuleEntry entry : checklist) {
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
}
