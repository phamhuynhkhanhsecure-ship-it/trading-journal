package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.common.exception.ResourceNotFoundException;
import com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeRequestDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeResponseDto;
import com.conarum.tradingjournal.domain.trade.mapper.TradeMapper;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import com.conarum.tradingjournal.domain.rule.repository.RuleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TradeServiceImpl Tests")
class TradeServiceImplTest {

    @Mock private TradeRepository tradeRepository;
    @Mock private RuleRepository ruleRepository;
    @Mock private TradeMapper tradeMapper;
    @Mock private GoogleDriveService googleDriveService;
    @Mock private TradeOutboxEventRepository tradeOutboxEventRepository;

    @InjectMocks private TradeServiceImpl tradeService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        var field = TradeServiceImpl.class.getDeclaredField("objectMapper");
        field.setAccessible(true);
        field.set(tradeService, objectMapper);
    }

    private Trade buildTrade(String id, String userEmail) {
        Trade trade = new Trade();
        trade.setId(id);
        trade.setUserEmail(userEmail);
        trade.setInstrument("BTCUSDT");
        trade.setSide("LONG");
        trade.setEntryPrice(BigDecimal.valueOf(50000));
        trade.setExitPrice(BigDecimal.valueOf(51000));
        trade.setQuantity(BigDecimal.ONE);
        trade.setPnl(BigDecimal.valueOf(1000));
        trade.setDate("2024-01-15");
        trade.setTags(new ArrayList<>());
        trade.setImages(new ArrayList<>());
        trade.setRuleChecklist(new ArrayList<>());
        return trade;
    }

    // ===== getAllTrades =====

    @Test
    @DisplayName("getAllTrades - should return mapped list")
    void getAllTrades_shouldReturnMappedList() {
        // Arrange
        Trade trade = buildTrade("trade-001", "user@example.com");
        TradeResponseDto dto = new TradeResponseDto();
        when(tradeRepository.findTradesByTradeFilter("user@example.com", any())).thenReturn(List.of(trade));
        when(tradeMapper.toDtoList(List.of(trade))).thenReturn(List.of(dto));

        // Act
        List<TradeResponseDto> result = tradeService.getAllTrades(new TradeFilterDto(), "user@example.com");

        // Assert
        assertThat(result).hasSize(1).contains(dto);
    }

    // ===== getTradeById =====

    @Test
    @DisplayName("getTradeById - should return trade when found")
    void getTradeById_found_shouldReturnDto() {
        // Arrange
        Trade trade = buildTrade("trade-001", "user@example.com");
        TradeResponseDto dto = new TradeResponseDto();
        when(tradeRepository.findByIdAndUserEmail("trade-001", "user@example.com")).thenReturn(Optional.of(trade));
        when(tradeMapper.toDto(trade)).thenReturn(dto);

        // Act
        TradeResponseDto result = tradeService.getTradeById("trade-001", "user@example.com");

        // Assert
        assertThat(result).isSameAs(dto);
    }

    @Test
    @DisplayName("getTradeById - should throw ResourceNotFoundException when not found")
    void getTradeById_notFound_shouldThrow() {
        // Arrange
        when(tradeRepository.findByIdAndUserEmail("trade-999", "user@example.com")).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> tradeService.getTradeById("trade-999", "user@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Trade not found");
    }

    // ===== createTrade =====

    @Test
    @DisplayName("createTrade - should save trade and write TradeCreatedEvent to outbox")
    void createTrade_shouldSaveTradeAndWriteOutbox() {
        // Arrange
        TradeRequestDto request = new TradeRequestDto();
        request.setRuleChecklist(new ArrayList<>());

        Trade trade = buildTrade("trade-001", "user@example.com");
        TradeResponseDto dto = new TradeResponseDto();

        when(tradeMapper.toEntity(request)).thenReturn(trade);
        when(tradeRepository.save(any())).thenReturn(trade);
        when(tradeMapper.toDto(trade)).thenReturn(dto);

        // Act
        TradeResponseDto result = tradeService.createTrade(request, "user@example.com");

        // Assert: trade saved
        verify(tradeRepository).save(trade);
        assertThat(result).isSameAs(dto);

        // Assert: outbox event written
        ArgumentCaptor<TradeOutboxEvent> outboxCaptor = ArgumentCaptor.forClass(TradeOutboxEvent.class);
        verify(tradeOutboxEventRepository).save(outboxCaptor.capture());

        TradeOutboxEvent captured = outboxCaptor.getValue();
        assertThat(captured.getStatus()).isEqualTo("PENDING");
        assertThat(captured.getEventType()).isEqualTo("TradeCreatedEvent");
        assertThat(captured.getAggregateId()).isEqualTo("trade-001");
        assertThat(captured.getPayload()).contains("trade-001");
        assertThat(captured.getPayload()).contains("user@example.com");
    }

    @Test
    @DisplayName("createTrade - should set userEmail on trade entity")
    void createTrade_shouldSetUserEmailOnEntity() {
        // Arrange
        TradeRequestDto request = new TradeRequestDto();
        request.setRuleChecklist(new ArrayList<>());
        Trade trade = buildTrade(null, null);

        when(tradeMapper.toEntity(request)).thenReturn(trade);
        when(tradeRepository.save(any())).thenAnswer(inv -> {
            Trade t = inv.getArgument(0);
            t.setId("trade-002");
            return t;
        });
        when(tradeMapper.toDto(any())).thenReturn(new TradeResponseDto());

        // Act
        tradeService.createTrade(request, "user@example.com");

        // Assert: userEmail set
        assertThat(trade.getUserEmail()).isEqualTo("user@example.com");
    }

    // ===== updateTrade =====

    @Test
    @DisplayName("updateTrade - should update and return dto")
    void updateTrade_shouldUpdateAndReturn() {
        // Arrange
        TradeRequestDto request = new TradeRequestDto();
        request.setRuleChecklist(new ArrayList<>());
        Trade existingTrade = buildTrade("trade-001", "user@example.com");
        TradeResponseDto dto = new TradeResponseDto();

        when(tradeRepository.findByIdAndUserEmail("trade-001", "user@example.com")).thenReturn(Optional.of(existingTrade));
        when(tradeRepository.save(existingTrade)).thenReturn(existingTrade);
        when(tradeMapper.toDto(existingTrade)).thenReturn(dto);

        // Act
        TradeResponseDto result = tradeService.updateTrade("trade-001", request, "user@example.com");

        // Assert
        verify(tradeMapper).updateEntityFromDto(request, existingTrade);
        assertThat(result).isSameAs(dto);
    }

    @Test
    @DisplayName("updateTrade - should throw when trade not found")
    void updateTrade_notFound_shouldThrow() {
        // Arrange
        when(tradeRepository.findByIdAndUserEmail("trade-999", "user@example.com")).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> tradeService.updateTrade("trade-999", new TradeRequestDto(), "user@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ===== deleteTrade =====

    @Test
    @DisplayName("deleteTrade - should delete trade")
    void deleteTrade_shouldDelete() {
        // Arrange
        Trade trade = buildTrade("trade-001", "user@example.com");
        when(tradeRepository.findByIdAndUserEmail("trade-001", "user@example.com")).thenReturn(Optional.of(trade));

        // Act
        tradeService.deleteTrade("trade-001", "user@example.com");

        // Assert
        verify(tradeRepository).delete(trade);
    }

    @Test
    @DisplayName("deleteTrade - should throw when trade not found")
    void deleteTrade_notFound_shouldThrow() {
        // Arrange
        when(tradeRepository.findByIdAndUserEmail("trade-999", "user@example.com")).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> tradeService.deleteTrade("trade-999", "user@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ===== uploadImages =====

    @Test
    @DisplayName("uploadImages - should throw when exceeds 10 images")
    void uploadImages_exceedsLimit_shouldThrow() {
        // Arrange
        Trade trade = buildTrade("trade-001", "user@example.com");
        // Already has 10 images
        for (int i = 0; i < 10; i++) {
            trade.getImages().add(new Trade.TradeImage());
        }
        when(tradeRepository.findByIdAndUserEmail("trade-001", "user@example.com")).thenReturn(Optional.of(trade));

        // Create 1 more file
        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "test.png", "image/png", new byte[100]);

        // Act & Assert
        assertThatThrownBy(() -> tradeService.uploadImages("trade-001", List.of(file), "user@example.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Maximum 10 images per trade.");
    }
}
