import { GoogleGenAI } from "@google/genai";
import { DayStats, Track } from "../types";

const API_KEY = process.env.API_KEY || ''; 

export const GeminiService = {
  async analyzePerformance(track: Track, stats: DayStats[]) {
    if (!API_KEY) {
      return "請設定 API Key 以啟用 AI 教練分析功能。";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      const recentStats = stats.slice(-5);
      
      const prompt = `
        你是一位奧運級的場地自行車(Track Cycling)教練。選手正在進行 "${track.name}" 的專項訓練。
        
        近期訓練數據 (由近到遠)：
        ${recentStats.map(d => 
          `- 日期: ${d.date}, 平均成績: ${d.avgSeconds.toFixed(3)}秒, 最佳: ${d.bestSeconds.toFixed(3)}秒, 穩定度(0-100): ${d.stabilityScore.toFixed(0)}`
        ).join('\n')}

        請分析：
        1. **秒數趨勢**：是否有邊際效益遞減或突破？
        2. **穩定性分析**：在高強度下的輸出一致性。
        3. **下階段建議**：針對力量(Strength)或轉速(Cadence)提出具體訓練方向。
        
        請用繁體中文回答，語氣專業嚴謹，字數控制在 150 字以內。
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "數據不足，無法產生分析結果。";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "AI 教練暫時無法連線。";
    }
  }
};
