package com.conarum.tradingjournal.domain.trade.service;

import com.conarum.tradingjournal.common.metrics.TradingMetrics;
import com.conarum.tradingjournal.domain.trade.dto.TradeRequestDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeResponseDto;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.model.Trade.TradeImage;
import com.conarum.tradingjournal.domain.trade.model.TradeOutboxEvent;
import com.conarum.tradingjournal.domain.trade.repository.TradeOutboxEventRepository;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import com.conarum.tradingjournal.config.TestSecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Integration test: TradeService → MongoDB (embedded) + Outbox event creation.
 * Kafka is NOT needed here — the service only writes to the outbox collection,
 * not directly to Kafka. The scheduler is tested separately.
 *
 * @WebEnvironment.NONE = no HTTP server, no security filter — service layer only.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@DisplayName("TradeService Integration Tests")
class TradeServiceIntegrationTest {

    @Autowired TradeService tradeService;
    @Autowired TradeRepository tradeRepository;
    @Autowired TradeOutboxEventRepository outboxRepository;

    @MockBean GoogleDriveService googleDriveService;
    @MockBean com.conarum.tradingjournal.domain.ai.client.AiServiceClient aiServiceClient;

    @BeforeEach
    void setUp() {
        tradeRepository.deleteAll();
        outboxRepository.deleteAll();
    }

    // ── createTrade ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("createTrade — should persist Trade document to MongoDB")
    void createTrade_shouldPersistToMongoDB() {
        TradeResponseDto result = tradeService.createTrade(buildRequest("BTCUSDT"), "user@test.com");

        assertThat(result.getId()).isNotNull();
        assertThat(result.getInstrument()).isEqualTo("BTCUSDT");
        assertThat(result.getSide()).isEqualTo("LONG");

        List<Trade> saved = tradeRepository.findAll();
        assertThat(saved).hasSize(1);
        assertThat(saved.get(0).getUserEmail()).isEqualTo("user@test.com");
    }

    @Test
    @DisplayName("createTrade — should write PENDING TradeCreatedEvent to outbox")
    void createTrade_shouldWriteOutboxEvent() {
        tradeService.createTrade(buildRequest("ETHUSDT"), "user@test.com");

        List<TradeOutboxEvent> events = outboxRepository.findAll();
        assertThat(events).hasSize(1);

        TradeOutboxEvent evt = events.get(0);
        assertThat(evt.getStatus()).isEqualTo("PENDING");
        assertThat(evt.getEventType()).isEqualTo("TradeCreatedEvent");
        assertThat(evt.getTopic()).isEqualTo("trading-events");
        assertThat(evt.getPayload()).contains("ETHUSDT");
        assertThat(evt.getPayload()).contains("user@test.com");
    }

    @Test
    @DisplayName("createTrade — outbox aggregateId matches saved trade id")
    void createTrade_outboxAggregateIdMatchesTradeId() {
        TradeResponseDto result = tradeService.createTrade(buildRequest("SOLUSDT"), "user@test.com");

        TradeOutboxEvent evt = outboxRepository.findAll().get(0);
        assertThat(evt.getAggregateId()).isEqualTo(result.getId());
    }

    @Test
    @DisplayName("createTrade — multiple trades produce multiple outbox events")
    void createTrade_multipleTrades_multipleOutboxEvents() {
        tradeService.createTrade(buildRequest("BTCUSDT"), "user@test.com");
        tradeService.createTrade(buildRequest("ETHUSDT"), "user@test.com");
        tradeService.createTrade(buildRequest("SOLUSDT"), "user@test.com");

        assertThat(tradeRepository.findAll()).hasSize(3);
        assertThat(outboxRepository.findAll()).hasSize(3);
    }

    // ── getAllTrades ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("getAllTrades — should return only trades belonging to the user")
    void getAllTrades_shouldReturnOnlyUserTrades() {
        tradeService.createTrade(buildRequest("BTCUSDT"), "user-a@test.com");
        tradeService.createTrade(buildRequest("ETHUSDT"), "user-a@test.com");
        tradeService.createTrade(buildRequest("SOLUSDT"), "user-b@test.com");

        List<TradeResponseDto> userATrades = tradeService.getAllTrades(
                new com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto(), "user-a@test.com");
        List<TradeResponseDto> userBTrades = tradeService.getAllTrades(
                new com.conarum.tradingjournal.domain.trade.dto.TradeFilterDto(), "user-b@test.com");

        assertThat(userATrades).hasSize(2);
        assertThat(userBTrades).hasSize(1);
        assertThat(userBTrades.get(0).getInstrument()).isEqualTo("SOLUSDT");
    }

    // ── getTradeById ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getTradeById — should return trade by id")
    void getTradeById_shouldReturnTrade() {
        TradeResponseDto created = tradeService.createTrade(buildRequest("BTCUSDT"), "user@test.com");

        TradeResponseDto found = tradeService.getTradeById(created.getId(), "user@test.com");

        assertThat(found.getId()).isEqualTo(created.getId());
        assertThat(found.getInstrument()).isEqualTo("BTCUSDT");
    }

    @Test
    @DisplayName("getTradeById — should throw ResourceNotFoundException for wrong user")
    void getTradeById_wrongUser_shouldThrow() {
        TradeResponseDto created = tradeService.createTrade(buildRequest("BTCUSDT"), "user-a@test.com");

        assertThatThrownBy(() -> tradeService.getTradeById(created.getId(), "user-b@test.com"))
                .isInstanceOf(com.conarum.tradingjournal.common.exception.ResourceNotFoundException.class);
    }

    // ── updateTrade ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateTrade — should update instrument and persist")
    void updateTrade_shouldPersistUpdate() {
        TradeResponseDto created = tradeService.createTrade(buildRequest("BTCUSDT"), "user@test.com");

        TradeRequestDto updateReq = buildRequest("ETHUSDT");
        TradeResponseDto updated = tradeService.updateTrade(created.getId(), updateReq, "user@test.com");

        assertThat(updated.getInstrument()).isEqualTo("ETHUSDT");

        // Verify persisted in MongoDB
        Trade inDb = tradeRepository.findById(created.getId()).orElseThrow();
        assertThat(inDb.getInstrument()).isEqualTo("ETHUSDT");
    }

    // ── deleteTrade ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteTrade — should remove trade from MongoDB")
    void deleteTrade_shouldRemoveFromMongoDB() {
        TradeResponseDto created = tradeService.createTrade(buildRequest("BTCUSDT"), "user@test.com");
        assertThat(tradeRepository.findAll()).hasSize(1);

        tradeService.deleteTrade(created.getId(), "user@test.com");

        assertThat(tradeRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("deleteTrade — should call googleDriveService.deleteFile for each image")
    void deleteTrade_shouldDeleteDriveImages() {
        // Arrange: manually create a trade with Drive images
        Trade trade = new Trade();
        trade.setUserEmail("user@test.com");
        trade.setInstrument("BTCUSDT");
        trade.setSide("LONG");
        trade.setDate("2024-01-15");
        trade.setPnl(BigDecimal.valueOf(500));

        TradeImage img1 = new TradeImage();
        img1.setId("img-1");
        img1.setDriveFileId("drive-file-id-1");

        TradeImage img2 = new TradeImage();
        img2.setId("img-2");
        img2.setDriveFileId("drive-file-id-2");

        trade.setImages(new ArrayList<>(List.of(img1, img2)));
        Trade saved = tradeRepository.save(trade);

        // Act
        tradeService.deleteTrade(saved.getId(), "user@test.com");

        // Assert: Drive files deleted
        verify(googleDriveService).deleteFile("drive-file-id-1");
        verify(googleDriveService).deleteFile("drive-file-id-2");
        assertThat(tradeRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("deleteTrade — Drive failure is non-fatal, trade still deleted")
    void deleteTrade_driveFailure_tradeStillDeleted() {
        Trade trade = new Trade();
        trade.setUserEmail("user@test.com");
        trade.setInstrument("BTCUSDT");
        trade.setSide("LONG");
        trade.setDate("2024-01-15");
        trade.setPnl(BigDecimal.ZERO);

        TradeImage img = new TradeImage();
        img.setId("img-1");
        img.setDriveFileId("drive-file-id");
        trade.setImages(new ArrayList<>(List.of(img)));
        Trade saved = tradeRepository.save(trade);

        doThrow(new RuntimeException("Drive API down"))
                .when(googleDriveService).deleteFile(anyString());

        // Should NOT throw — Drive failure is non-fatal
        tradeService.deleteTrade(saved.getId(), "user@test.com");

        assertThat(tradeRepository.findAll()).isEmpty();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private TradeRequestDto buildRequest(String instrument) {
        TradeRequestDto r = new TradeRequestDto();
        r.setInstrument(instrument);
        r.setSide("LONG");
        r.setDate("2024-01-15");
        r.setEntryPrice(BigDecimal.valueOf(50000));
        r.setExitPrice(BigDecimal.valueOf(51000));
        r.setQuantity(BigDecimal.ONE);
        r.setPnl(BigDecimal.valueOf(1000));
        r.setFees(BigDecimal.ZERO);
        r.setRuleChecklist(new ArrayList<>());
        return r;
    }
}
