package com.conarum.tradingjournal.domain.trade.controller;

import com.conarum.tradingjournal.domain.trade.dto.TradeRequestDto;
import com.conarum.tradingjournal.domain.trade.dto.TradeResponseDto;
import com.conarum.tradingjournal.domain.trade.service.GoogleDriveService;
import com.conarum.tradingjournal.domain.trade.service.TradeService;
import com.conarum.tradingjournal.integration.client.UserServiceClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller integration test — full Spring context with embedded MongoDB (flapdoodle).
 *
 * Uses @SpringBootTest(webEnvironment=MOCK) + @AutoConfigureMockMvc + @ActiveProfiles("test").
 * This loads the complete context (solving @EnableMongoAuditing + Feign issues that
 * @WebMvcTest cannot handle) while still using MockMvc for HTTP assertions.
 *
 * @MockBean replaces: TradeService (no DB needed), UserServiceClient (no Feign call),
 * GoogleDriveService (no Drive call), AiServiceClient (no Gemini call).
 * jwt() post-processor bypasses the JWT decoder entirely.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("TradeController — HTTP layer tests")
class TradeControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean TradeService tradeService;
    @MockBean UserServiceClient userServiceClient;
    @MockBean GoogleDriveService googleDriveService;
    @MockBean com.conarum.tradingjournal.domain.ai.client.AiServiceClient aiServiceClient;

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor userJwt() {
        return jwt().jwt(j -> j.claim("email", "user@example.com"));
    }

    // ── GET /api/trades ────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/trades — returns 200 with ApiResponse wrapper")
    void getAllTrades_authenticated_returns200() throws Exception {
        TradeResponseDto dto = new TradeResponseDto();
        dto.setId("trade-001");
        dto.setInstrument("BTCUSDT");
        dto.setSide("LONG");
        dto.setPnl(BigDecimal.valueOf(500));

        when(tradeService.getAllTrades(any(), eq("user@example.com"))).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/trades").with(userJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("trade-001"))
                .andExpect(jsonPath("$.data[0].instrument").value("BTCUSDT"));
    }

    @Test
    @DisplayName("GET /api/trades — 401 without JWT")
    void getAllTrades_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/trades"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/trades — returns empty list when no trades")
    void getAllTrades_noTrades_returnsEmptyList() throws Exception {
        when(tradeService.getAllTrades(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/trades").with(userJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    // ── GET /api/trades/{id} ───────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/trades/{id} — returns 200 with trade")
    void getTradeById_found_returns200() throws Exception {
        TradeResponseDto dto = new TradeResponseDto();
        dto.setId("trade-001");
        dto.setInstrument("ETHUSDT");

        when(tradeService.getTradeById("trade-001", "user@example.com")).thenReturn(dto);

        mockMvc.perform(get("/api/trades/trade-001").with(userJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("trade-001"))
                .andExpect(jsonPath("$.data.instrument").value("ETHUSDT"));
    }

    // ── POST /api/trades ───────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/trades — creates trade, returns 201")
    void createTrade_validRequest_returns201() throws Exception {
        TradeRequestDto request = new TradeRequestDto();
        request.setInstrument("SOLUSDT");
        request.setSide("LONG");
        request.setDate("2024-01-15");
        request.setEntryPrice(BigDecimal.valueOf(100));
        request.setExitPrice(BigDecimal.valueOf(110));
        request.setQuantity(BigDecimal.valueOf(10));

        TradeResponseDto created = new TradeResponseDto();
        created.setId("trade-new");
        created.setInstrument("SOLUSDT");

        when(tradeService.createTrade(any(), eq("user@example.com"))).thenReturn(created);

        mockMvc.perform(post("/api/trades")
                        .with(userJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("trade-new"));

        verify(tradeService).createTrade(any(), eq("user@example.com"));
    }

    @Test
    @DisplayName("POST /api/trades — 401 without JWT")
    void createTrade_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/trades")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(tradeService);
    }

    // ── PUT /api/trades/{id} ───────────────────────────────────────────────────

    @Test
    @DisplayName("PUT /api/trades/{id} — updates trade, returns 200")
    void updateTrade_validRequest_returns200() throws Exception {
        TradeRequestDto request = new TradeRequestDto();
        request.setInstrument("BTCUSDT");
        request.setDate("2024-01-15");   // @NotBlank required
        request.setSide("LONG");          // @NotBlank required

        TradeResponseDto updated = new TradeResponseDto();
        updated.setId("trade-001");
        updated.setInstrument("BTCUSDT");

        when(tradeService.updateTrade(eq("trade-001"), any(), eq("user@example.com"))).thenReturn(updated);

        mockMvc.perform(put("/api/trades/trade-001")
                        .with(userJwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("trade-001"));
    }

    // ── DELETE /api/trades/{id} ────────────────────────────────────────────────

    @Test
    @DisplayName("DELETE /api/trades/{id} — deletes trade, returns 200")
    void deleteTrade_valid_returns200() throws Exception {
        doNothing().when(tradeService).deleteTrade("trade-001", "user@example.com");

        mockMvc.perform(delete("/api/trades/trade-001").with(userJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(tradeService).deleteTrade("trade-001", "user@example.com");
    }
}
