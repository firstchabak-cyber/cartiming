import { GoogleGenerativeAI } from "@google/generative-ai";

let cached: GoogleGenerativeAI | null = null;

function getClient() {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  cached = new GoogleGenerativeAI(apiKey);
  return cached;
}

export function getGeminiModel() {
  return getClient().getGenerativeModel({ model: "gemini-2.5-flash" });
}

export async function analyzePrice(prompt: string) {
  const result = await getGeminiModel().generateContent(prompt);
  return result.response.text();
}
