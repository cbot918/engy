import { getOpenRouter } from "./openrouter";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  FEEDBACK_JSON_SCHEMA,
  FeedbackZodSchema,
  type FeedbackResult,
} from "./prompts/feedback";

export interface FeedbackInput {
  content: string;
  promptTitle?: string;
  promptBody?: string;
  type?: string;
}

export async function getFeedback(
  input: FeedbackInput
): Promise<{ result: FeedbackResult; model: string; raw: string }> {
  const model = process.env.FEEDBACK_MODEL ?? "google/gemini-2.5-flash";
  const openrouter = getOpenRouter();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: buildUserPrompt(input) },
  ];

  let raw: string;
  try {
    // 先嘗試 strict json_schema（Gemini 2.5 Flash 支援）
    const completion = await openrouter.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: FEEDBACK_JSON_SCHEMA,
      },
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    // 某些模型不支援 json_schema → 退回 json_object，並在 prompt 內附 schema
    console.warn(
      "[feedback] json_schema 失敗，改用 json_object 模式:",
      (err as Error).message
    );
    const completion = await openrouter.chat.completions.create({
      model,
      messages: [
        messages[0],
        {
          role: "user" as const,
          content:
            buildUserPrompt(input) +
            "\n\nThe JSON must match this schema exactly:\n" +
            JSON.stringify(FEEDBACK_JSON_SCHEMA.schema),
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  }

  const parsed = FeedbackZodSchema.parse(JSON.parse(raw));
  return { result: parsed, model, raw };
}
