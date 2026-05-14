import { GoogleGenAI } from '@google/genai';
import type { IAIService } from '../interfaces/ai.interfaces.js';
import type { ITradeRepository } from '../interfaces/trade.interfaces.js';

/**
 * AI service — Gemini API integration.
 * SRP: only AI prompt engineering and API calls.
 */
export class AIService implements IAIService {
  constructor(
    private readonly tradeRepo: ITradeRepository,
  ) {}

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured in .env file');
    return new GoogleGenAI({ apiKey });
  }

  async getCoaching(userEmail: string): Promise<string> {
    const ai = this.getClient();
    const recentTrades = await this.tradeRepo.findAll({ userEmail });
    // Sort desc and take last 100
    const sorted = recentTrades.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);

    if (sorted.length === 0) return 'Bạn chưa có giao dịch nào để AI phân tích.';

    const totalTrades = sorted.length;
    const wins = sorted.filter(t => t.pnl > 0).length;
    const winrate = ((wins / totalTrades) * 100).toFixed(2);

    const prompt = `Bạn là một Trading Coach chuyên nghiệp (phong cách trực diện, sâu sắc). 
Tôi có dữ liệu 100 lệnh giao dịch gần nhất của tôi. 
- Tổng số lệnh: ${totalTrades}
- Winrate: ${winrate}%
- Dữ liệu chi tiết:
${JSON.stringify(sorted.map(t => ({
  date: t.date, instrument: t.instrument, side: t.side, pnl: t.pnl, tags: t.tags
})), null, 2)}

Hãy phân tích nhanh gọn (dưới 500 chữ), chỉ ra 1 điểm mạnh nhất, 1 điểm yếu/lỗi chí mạng khiến tôi mất tiền, và 1 lời khuyên thực tế. Trình bày bằng tiếng Việt, dùng Markdown. Không cần lời chào hỏi.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || '';
  }

  async analyzeImage(imageBase64: string): Promise<Record<string, any>> {
    const ai = this.getClient();
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Hãy đóng vai trò một công cụ nhận diện ảnh biểu đồ tài chính. Trả về cho tôi dữ liệu JSON khớp chính xác các thông tin bạn thấy trên ảnh. 
Yêu cầu JSON format (CHỈ trả về JSON, không thêm code block hay text nào khác):
{
  "instrument": "Cặp tiền hoặc tài sản (ví dụ: XAU-USD, EUR-USD, BTC-USDT, TSLA). Nếu không thấy trả về rỗng",
  "side": "KẾT LUẬN LÀ LONG HAY SHORT DỰA VÀO VỊ TRÍ STOPLOSS VÀ TAKEPROFIT SO VỚI ENTRY PRICE (Ví dụ TP < Entry và SL > Entry thì là SHORT, ngược lại là LONG). Trả về 'LONG' hoặc 'SHORT'",
  "entryPrice": Số float (giá vào lệnh - thường là label MÀU VÀNG/CAM trên trục giá TradingView),
  "stopLoss": Số float (giá cắt lỗ - thường là label MÀU ĐỎ trên trục giá TradingView),
  "takeProfit": Số float (giá chốt lời - thường là label MÀU XANH LÁ trên trục giá TradingView)
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
      ],
    });

    const textResult = response.text || '{}';
    try {
      const cleanText = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    } catch {
      console.error('AI Vision parse error:', textResult);
      return {};
    }
  }

  async chat(messages: any[], userEmail: string, language: string = 'vi'): Promise<string> {
    const ai = this.getClient();

    const recentTrades = await this.tradeRepo.findAll({ userEmail });
    const sorted = recentTrades.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);

    let systemInstruction = 'Bạn là trợ lý AI Trading (Gemini) của ứng dụng Trading Journal. Hãy trò chuyện tự nhiên, ngắn gọn và hữu ích. Dưới đây là bối cảnh giao dịch gần nhất của người dùng này:\n';

    if (sorted.length > 0) {
      const totalTrades = sorted.length;
      const wins = sorted.filter(t => t.pnl > 0).length;
      const winrate = ((wins / totalTrades) * 100).toFixed(2);
      systemInstruction += `- Tổng số lệnh gần đây: ${totalTrades}\n`;
      systemInstruction += `- Winrate: ${winrate}%\n`;
      systemInstruction += `- Dữ liệu lệnh chi tiết: ${JSON.stringify(sorted.map(t => ({
        date: t.date, instrument: t.instrument, side: t.side, pnl: t.pnl, tags: t.tags,
      })))}\n`;
    } else {
      systemInstruction += '- Người dùng chưa có giao dịch nào.\n';
    }

    let languageInstruction = 'Trình bày bằng tiếng Việt dùng Markdown nếu cần.';
    if (language === 'en') {
      languageInstruction = 'CRITICAL: You MUST answer the user in English. Do not use Vietnamese. Use Markdown for formatting.';
    } else if (language === 'zh') {
      languageInstruction = 'CRITICAL: You MUST answer the user in Chinese (Simplified). Do not use Vietnamese. Use Markdown for formatting.';
    }
    systemInstruction += `Sử dụng thông tin này để trả lời các câu hỏi về lịch sử giao dịch của họ. ${languageInstruction}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: messages,
      config: { systemInstruction },
    });

    return response.text || '';
  }
}
