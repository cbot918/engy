import OpenAI from "openai";

let client: OpenAI | null = null;

// 延遲建立，避免 build 期間（無 API key）就實例化而報錯。
export function getOpenRouter(): OpenAI {
  if (client) return client;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY 未設定，請在 .env.local 填入你的 OpenRouter API key。"
    );
  }

  client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "Writing Trainer",
    },
  });
  return client;
}
