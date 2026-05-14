/** Contract for AI service (Gemini). */
export interface IAIService {
  getCoaching(userEmail: string): Promise<string>;
  analyzeImage(imageBase64: string): Promise<Record<string, any>>;
  chat(messages: any[], userEmail: string, language?: string): Promise<string>;
}
