import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

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

// 텍스트 분석용 모델 폴백 순서 (앞쪽이 우선)
const TEXT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

// 비전(이미지) 분석용 모델 폴백 순서
const VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

/**
 * 일시적 오류(503, overload, rate limit 등) 판별.
 * 이 경우 재시도 또는 폴백 모델 시도 가치가 있음.
 */
function isTransientError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("429") ||
    msg.includes("overload") ||
    msg.includes("high demand") ||
    msg.includes("unavailable") ||
    msg.includes("timeout") ||
    msg.includes("etimedout")
  );
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function getGeminiModel() {
  // 호환: 기존 코드가 직접 model 받아서 generateContent 호출하는 경우 대비
  return getClient().getGenerativeModel({ model: TEXT_MODELS[0] });
}

/**
 * 텍스트 프롬프트 분석. 503 등 일시 오류 시 모델별로 백오프 재시도 후
 * 다음 폴백 모델로 자동 전환.
 */
export async function analyzePrice(prompt: string): Promise<string> {
  let lastErr: unknown = null;
  for (const modelName of TEXT_MODELS) {
    const model = getClient().getGenerativeModel({
      model: modelName,
      // 시세 분석은 매번 같은 입력에 비슷한 값이 나와야 하므로 무작위성을 낮춘다.
      // (기본 temperature 1.0 → 조회할 때마다 가격이 출렁이는 원인)
      generationConfig: {
        temperature: 0.2,
        topP: 0.85,
      },
    });
    // 각 모델 당 2회까지 (즉시 + 1초 후)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        lastErr = err;
        if (!isTransientError(err)) {
          // 일시 오류 아니면 즉시 중단 (코드 버그·인증·요청 형식 문제)
          throw err;
        }
        if (attempt === 0) {
          await delay(1000);
        }
      }
    }
    // 모델 폴백 사이엔 500ms 만 대기
    await delay(500);
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("모든 모델에서 AI 분석 실패");
}

/**
 * 비전(이미지) 분석. 같은 패턴.
 */
export async function analyzeVision(parts: Part[]): Promise<string> {
  let lastErr: unknown = null;
  for (const modelName of VISION_MODELS) {
    const model = getClient().getGenerativeModel({ model: modelName });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(parts);
        return result.response.text();
      } catch (err) {
        lastErr = err;
        if (!isTransientError(err)) {
          throw err;
        }
        if (attempt === 0) {
          await delay(1000);
        }
      }
    }
    await delay(500);
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("모든 모델에서 비전 분석 실패");
}
