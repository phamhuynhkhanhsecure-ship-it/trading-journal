import type { Request, Response } from 'express';
import type { IAIService } from '../interfaces/ai.interfaces.js';
import { ValidationError } from '../errors/ValidationError.js';

export class AIController {
  constructor(private readonly aiService: IAIService) {}

  coach = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user.email;
    const data = await this.aiService.getCoaching(userEmail);
    res.json({ success: true, data });
  };

  vision = async (req: Request, res: Response): Promise<void> => {
    const { imageBase64 } = req.body;
    if (!imageBase64) throw new ValidationError('Thiếu dữ liệu ảnh');
    const data = await this.aiService.analyzeImage(imageBase64);
    res.json({ success: true, data });
  };

  chat = async (req: Request, res: Response): Promise<void> => {
    const { messages, language = 'vi' } = req.body;
    if (!messages || !Array.isArray(messages)) throw new ValidationError('Thiếu mảng messages');
    const userEmail = (req as any).user.email;
    const data = await this.aiService.chat(messages, userEmail, language);
    res.json({ success: true, data });
  };
}
