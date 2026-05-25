package com.conarum.tradingjournal.domain.ai.service;

import com.conarum.tradingjournal.domain.trade.model.Trade;
import com.conarum.tradingjournal.domain.trade.repository.TradeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.conarum.tradingjournal.domain.ai.client.AiServiceClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final TradeRepository tradeRepository;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private String callGemini(Map<String, Object> requestBody) {
        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            throw new RuntimeException("GEMINI_API_KEY is not configured");
        }
        
        try {
            Map<String, Object> body = aiServiceClient.generateContent(geminiApiKey, requestBody);
            if (body != null && body.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (!parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
            return "";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error communicating with AI: " + e.getMessage();
        }
    }

    @Override
    public String getCoaching(String userEmail) {
        List<Trade> trades = tradeRepository.findByUserEmailOrderByDateDesc(userEmail);
        List<Trade> sorted = trades.stream().limit(100).collect(Collectors.toList());
        
        if (sorted.isEmpty()) {
            return "Bạn chưa có giao dịch nào để AI phân tích.";
        }

        long wins = sorted.stream().filter(t -> t.getPnl() - t.getFees() > 0).count();
        double winrate = (double) wins / sorted.size() * 100;
        
        List<Map<String, Object>> tradeData = sorted.stream().map(t -> Map.<String, Object>of(
            "date", t.getDate(),
            "instrument", t.getInstrument(),
            "side", t.getSide(),
            "pnl", t.getPnl() - t.getFees(),
            "tags", t.getTags() != null ? t.getTags() : new ArrayList<>()
        )).collect(Collectors.toList());

        String prompt = String.format("Bạn là một Trading Coach chuyên nghiệp (phong cách trực diện, sâu sắc).\n" +
            "Tôi có dữ liệu %d lệnh giao dịch gần nhất của tôi.\n" +
            "- Tổng số lệnh: %d\n" +
            "- Winrate: %.2f%%\n" +
            "- Dữ liệu chi tiết:\n%s\n\n" +
            "Hãy phân tích nhanh gọn (dưới 500 chữ), chỉ ra 1 điểm mạnh nhất, 1 điểm yếu/lỗi chí mạng khiến tôi mất tiền, và 1 lời khuyên thực tế. Trình bày bằng tiếng Việt, dùng Markdown. Không cần lời chào hỏi.",
            sorted.size(), sorted.size(), winrate, tradeData.toString());

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            )
        );

        return callGemini(requestBody);
    }

    @Override
    public Map<String, Object> analyzeImage(String imageBase64) {
        String cleanBase64 = imageBase64.replaceFirst("^data:image/\\w+;base64,", "");
        
        String prompt = "Hãy đóng vai trò một công cụ nhận diện ảnh biểu đồ tài chính. Trả về cho tôi dữ liệu JSON khớp chính xác các thông tin bạn thấy trên ảnh.\n" +
            "Yêu cầu JSON format (CHỈ trả về JSON, không thêm code block hay text nào khác):\n" +
            "{\n" +
            "  \"instrument\": \"Cặp tiền hoặc tài sản (ví dụ: XAU-USD, EUR-USD, BTC-USDT, TSLA). Nếu không thấy trả về rỗng\",\n" +
            "  \"side\": \"KẾT LUẬN LÀ LONG HAY SHORT DỰA VÀO VỊ TRÍ STOPLOSS VÀ TAKEPROFIT SO VỚI ENTRY PRICE (Ví dụ TP < Entry và SL > Entry thì là SHORT, ngược lại là LONG). Trả về 'LONG' hoặc 'SHORT'\",\n" +
            "  \"entryPrice\": Số float (giá vào lệnh - thường là label MÀU VÀNG/CAM/ĐEN trên trục giá TradingView),\n" +
            "  \"stopLoss\": Số float (giá cắt lỗ - thường là label MÀU ĐỎ trên trục giá TradingView),\n" +
            "  \"takeProfit\": Số float (giá chốt lời - thường là label MÀU XANH LÁ trên trục giá TradingView)\n" +
            "}";

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt),
                    Map.of("inlineData", Map.of(
                        "mimeType", "image/jpeg",
                        "data", cleanBase64
                    ))
                ))
            )
        );

        String textResult = callGemini(requestBody);
        if (textResult.startsWith("Error")) {
            throw new RuntimeException(textResult);
        }
        
        textResult = textResult.replace("```json", "").replace("```", "").trim();
        
        try {
            return objectMapper.readValue(textResult, Map.class);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("AI returned invalid JSON: " + textResult, e);
        }
    }

    @Override
    public String chat(Object messages, String userEmail, String language) {
        List<Trade> trades = tradeRepository.findByUserEmailOrderByDateDesc(userEmail);
        List<Trade> sorted = trades.stream().limit(100).collect(Collectors.toList());
        
        String systemInstruction = "Bạn là trợ lý AI Trading (Gemini) của ứng dụng Trading Journal. Hãy trò chuyện tự nhiên, ngắn gọn và hữu ích. Dưới đây là bối cảnh giao dịch gần nhất của người dùng này:\n";
        
        if (!sorted.isEmpty()) {
            long wins = sorted.stream().filter(t -> t.getPnl() - t.getFees() > 0).count();
            double winrate = (double) wins / sorted.size() * 100;
            
            systemInstruction += "- Tổng số lệnh gần đây: " + sorted.size() + "\n";
            systemInstruction += String.format("- Winrate: %.2f%%\n", winrate);
            
            List<Map<String, Object>> tradeData = sorted.stream().map(t -> Map.<String, Object>of(
                "date", t.getDate(),
                "instrument", t.getInstrument(),
                "side", t.getSide(),
                "pnl", t.getPnl() - t.getFees(),
                "tags", t.getTags() != null ? t.getTags() : new ArrayList<>()
            )).collect(Collectors.toList());
            
            systemInstruction += "- Dữ liệu lệnh chi tiết: " + tradeData.toString() + "\n";
        } else {
            systemInstruction += "- Người dùng chưa có giao dịch nào.\n";
        }
        
        String langInstruction = "Trình bày bằng tiếng Việt dùng Markdown nếu cần.";
        if ("en".equals(language)) {
            langInstruction = "CRITICAL: You MUST answer the user in English. Do not use Vietnamese. Use Markdown for formatting.";
        } else if ("zh".equals(language)) {
            langInstruction = "CRITICAL: You MUST answer the user in Chinese (Simplified). Do not use Vietnamese. Use Markdown for formatting.";
        }
        systemInstruction += "Sử dụng thông tin này để trả lời các câu hỏi về lịch sử giao dịch của họ. " + langInstruction;

        Map<String, Object> requestBody = Map.of(
            "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
            "contents", messages
        );

        return callGemini(requestBody);
    }
}
