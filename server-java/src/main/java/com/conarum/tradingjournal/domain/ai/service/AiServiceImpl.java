package com.conarum.tradingjournal.domain.ai.service;

import com.conarum.tradingjournal.common.metrics.TradingMetrics;
import com.conarum.tradingjournal.domain.ai.client.AiServiceClient;
import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiServiceImpl implements AiService {

    private final TradeRepository tradeRepository;
    private final AiServiceClient aiServiceClient;
    private final TradingMetrics tradingMetrics;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    // ── Internal Gemini call ──────────────────────────────────────────────────

    private String callGemini(Map<String, Object> requestBody) {
        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            throw new RuntimeException("GEMINI_API_KEY is not configured");
        }
        try {
            Map<String, Object> body = aiServiceClient.generateContent(geminiApiKey, requestBody);
            if (body != null && body.containsKey("candidates")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (!candidates.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (!parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
            return "";
        } catch (Exception e) {
            log.error("Error communicating with Gemini AI", e);
            return "Error communicating with AI: " + e.getMessage();
        }
    }

    // ── Service methods ───────────────────────────────────────────────────────

    @Override
    public String getCoaching(String userEmail) {
        tradingMetrics.recordAiCoach();
        Timer.Sample timer = tradingMetrics.startAiCoachTimer();
        try {
            List<Trade> sorted = tradeRepository.findByUserEmailOrderByDateDesc(userEmail)
                    .stream().limit(100).collect(Collectors.toList());

            if (sorted.isEmpty()) {
                return "Bạn chưa có giao dịch nào để AI phân tích.";
            }

            long wins = sorted.stream()
                    .filter(t -> netPnl(t).compareTo(BigDecimal.ZERO) > 0).count();
            double winrate = (double) wins / sorted.size() * 100;

            List<Map<String, Object>> tradeData = sorted.stream().map(t -> Map.<String, Object>of(
                    "date", t.getDate(),
                    "instrument", t.getInstrument(),
                    "side", t.getSide(),
                    "pnl", netPnl(t),
                    "tags", t.getTags() != null ? t.getTags() : new ArrayList<>()
            )).collect(Collectors.toList());

            String prompt = String.format(
                    "Bạn là một Trading Coach chuyên nghiệp (phong cách trực diện, sâu sắc).\n" +
                    "Tôi có dữ liệu %d lệnh giao dịch gần nhất của tôi.\n" +
                    "- Tổng số lệnh: %d\n- Winrate: %.2f%%\n- Dữ liệu chi tiết:\n%s\n\n" +
                    "Hãy phân tích nhanh gọn (dưới 500 chữ), chỉ ra 1 điểm mạnh nhất, 1 điểm yếu/lỗi chí mạng khiến tôi mất tiền, " +
                    "và 1 lời khuyên thực tế. Trình bày bằng tiếng Việt, dùng Markdown. Không cần lời chào hỏi.",
                    sorted.size(), sorted.size(), winrate, tradeData);

            return callGemini(Map.of("contents", List.of(
                    Map.of("parts", List.of(Map.of("text", prompt))))));
        } finally {
            tradingMetrics.stopAiCoachTimer(timer);
        }
    }

    @Override
    public Map<String, Object> analyzeImage(String imageBase64) {
        tradingMetrics.recordAiVision();
        Timer.Sample timer = tradingMetrics.startAiVisionTimer();
        try {
            String cleanBase64 = imageBase64.replaceFirst("^data:image/\\w+;base64,", "");
            String prompt =
                    "Hãy đóng vai trò một công cụ nhận diện ảnh biểu đồ tài chính. Trả về cho tôi dữ liệu JSON khớp chính xác các thông tin bạn thấy trên ảnh.\n" +
                    "Yêu cầu JSON format (CHỈ trả về JSON, không thêm code block hay text nào khác):\n" +
                    "{\n" +
                    "  \"instrument\": \"Cặp tiền hoặc tài sản (ví dụ: XAU-USD, EUR-USD, BTC-USDT, TSLA). Nếu không thấy trả về rỗng\",\n" +
                    "  \"side\": \"KẾT LUẬN LÀ LONG HAY SHORT (trả về 'LONG' hoặc 'SHORT')\",\n" +
                    "  \"entryPrice\": \"Số float (giá vào lệnh)\",\n" +
                    "  \"stopLoss\": \"Số float (giá cắt lỗ)\",\n" +
                    "  \"takeProfit\": \"Số float (giá chốt lời)\"\n" +
                    "}";

            String textResult = callGemini(Map.of("contents", List.of(
                    Map.of("parts", List.of(
                            Map.of("text", prompt),
                            Map.of("inlineData", Map.of("mimeType", "image/jpeg", "data", cleanBase64))
                    )))));

            if (textResult.startsWith("Error")) throw new RuntimeException(textResult);

            textResult = textResult.replace("```json", "").replace("```", "").trim();
            try {
                return objectMapper.readValue(textResult, Map.class);
            } catch (Exception e) {
                log.error("AI returned invalid JSON for vision request: {}", textResult, e);
                throw new RuntimeException("AI returned invalid JSON: " + textResult, e);
            }
        } finally {
            tradingMetrics.stopAiVisionTimer(timer);
        }
    }

    @Override
    public String chat(Object messages, String userEmail, String language) {
        tradingMetrics.recordAiChat();
        Timer.Sample timer = tradingMetrics.startAiChatTimer();
        try {
            List<Trade> sorted = tradeRepository.findByUserEmailOrderByDateDesc(userEmail)
                    .stream().limit(100).collect(Collectors.toList());

            String langInstruction = switch (language != null ? language : "vi") {
                case "en" -> "CRITICAL: You MUST answer the user in English. Use Markdown for formatting.";
                case "zh" -> "CRITICAL: You MUST answer the user in Chinese (Simplified). Use Markdown for formatting.";
                default   -> "Trình bày bằng tiếng Việt dùng Markdown nếu cần.";
            };

            StringBuilder systemInstruction = new StringBuilder(
                    "Bạn là trợ lý AI Trading (Gemini) của ứng dụng Trading Journal. " +
                    "Hãy trò chuyện tự nhiên, ngắn gọn và hữu ích. " +
                    "Dưới đây là bối cảnh giao dịch gần nhất của người dùng này:\n");

            if (!sorted.isEmpty()) {
                long wins = sorted.stream().filter(t -> netPnl(t).compareTo(BigDecimal.ZERO) > 0).count();
                double winrate = (double) wins / sorted.size() * 100;
                systemInstruction.append("- Tổng số lệnh gần đây: ").append(sorted.size()).append("\n");
                systemInstruction.append(String.format("- Winrate: %.2f%%\n", winrate));
                List<Map<String, Object>> tradeData = sorted.stream().map(t -> Map.<String, Object>of(
                        "date", t.getDate(), "instrument", t.getInstrument(),
                        "side", t.getSide(), "pnl", netPnl(t),
                        "tags", t.getTags() != null ? t.getTags() : new ArrayList<>()
                )).collect(Collectors.toList());
                systemInstruction.append("- Dữ liệu lệnh chi tiết: ").append(tradeData).append("\n");
            } else {
                systemInstruction.append("- Người dùng chưa có giao dịch nào.\n");
            }
            systemInstruction.append("Sử dụng thông tin này để trả lời câu hỏi về lịch sử giao dịch của họ. ")
                             .append(langInstruction);

            return callGemini(Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction.toString()))),
                    "contents", messages));
        } finally {
            tradingMetrics.stopAiChatTimer(timer);
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private BigDecimal netPnl(Trade t) {
        return t.getPnl().subtract(t.getFees() != null ? t.getFees() : BigDecimal.ZERO);
    }
}
