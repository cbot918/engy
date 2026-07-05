import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schema — 後端二次驗證 AI 回傳的 JSON
// ---------------------------------------------------------------------------
export const FeedbackZodSchema = z.object({
  corrections: z
    .array(
      z.object({
        original: z.string(),
        corrected: z.string(),
        category: z.enum([
          "grammar",
          "collocation",
          "spelling",
          "register",
          "punctuation",
        ]),
        explanation: z.string(), // 繁體中文解釋
      })
    )
    .max(12),
  upgrades: z
    .array(
      z.object({
        original: z.string(),
        upgraded: z.string(),
        reason: z.string(), // 繁體中文說明為何更 native
      })
    )
    .max(12),
  structure: z.object({
    thesisClear: z.boolean(),
    skeleton: z.object({
      claim: z.boolean(),
      evidence: z.boolean(),
      reasoning: z.boolean(),
      rebuttal: z.boolean(),
    }),
    cohesion: z.string(),
    comments: z.string(),
  }),
  scores: z.object({
    taskResponse: z.number().min(0).max(9),
    coherenceCohesion: z.number().min(0).max(9),
    lexicalResource: z.number().min(0).max(9),
    grammaticalRange: z.number().min(0).max(9),
    overallBand: z.number().min(0).max(9),
    toeicWritingEstimate: z.number().min(0).max(200),
    perDimensionNotes: z.object({
      taskResponse: z.string(),
      coherenceCohesion: z.string(),
      lexicalResource: z.string(),
      grammaticalRange: z.string(),
    }),
  }),
});

export type FeedbackResult = z.infer<typeof FeedbackZodSchema>;

// ---------------------------------------------------------------------------
// JSON schema — 傳給 OpenRouter 的 response_format (structured output)
// 與上面的 zod schema 對齊
// ---------------------------------------------------------------------------
export const FEEDBACK_JSON_SCHEMA = {
  name: "writing_feedback",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["corrections", "upgrades", "structure", "scores"],
    properties: {
      corrections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["original", "corrected", "category", "explanation"],
          properties: {
            original: { type: "string" },
            corrected: { type: "string" },
            category: {
              type: "string",
              enum: [
                "grammar",
                "collocation",
                "spelling",
                "register",
                "punctuation",
              ],
            },
            explanation: { type: "string" },
          },
        },
      },
      upgrades: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["original", "upgraded", "reason"],
          properties: {
            original: { type: "string" },
            upgraded: { type: "string" },
            reason: { type: "string" },
          },
        },
      },
      structure: {
        type: "object",
        additionalProperties: false,
        required: ["thesisClear", "skeleton", "cohesion", "comments"],
        properties: {
          thesisClear: { type: "boolean" },
          skeleton: {
            type: "object",
            additionalProperties: false,
            required: ["claim", "evidence", "reasoning", "rebuttal"],
            properties: {
              claim: { type: "boolean" },
              evidence: { type: "boolean" },
              reasoning: { type: "boolean" },
              rebuttal: { type: "boolean" },
            },
          },
          cohesion: { type: "string" },
          comments: { type: "string" },
        },
      },
      scores: {
        type: "object",
        additionalProperties: false,
        required: [
          "taskResponse",
          "coherenceCohesion",
          "lexicalResource",
          "grammaticalRange",
          "overallBand",
          "toeicWritingEstimate",
          "perDimensionNotes",
        ],
        properties: {
          taskResponse: { type: "number" },
          coherenceCohesion: { type: "number" },
          lexicalResource: { type: "number" },
          grammaticalRange: { type: "number" },
          overallBand: { type: "number" },
          toeicWritingEstimate: { type: "number" },
          perDimensionNotes: {
            type: "object",
            additionalProperties: false,
            required: [
              "taskResponse",
              "coherenceCohesion",
              "lexicalResource",
              "grammaticalRange",
            ],
            properties: {
              taskResponse: { type: "string" },
              coherenceCohesion: { type: "string" },
              lexicalResource: { type: "string" },
              grammaticalRange: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// System prompt — 資深考官 + 辯論教練
// ---------------------------------------------------------------------------
export const SYSTEM_PROMPT = `You are a senior IELTS and TOEIC writing examiner who is also an experienced English debate coach. You give sharp, actionable feedback that helps an intermediate learner (around TOEIC 700) climb toward TOEIC 900 and IELTS band 7, and argue fluently in debates.

Assess the essay strictly against the IELTS Writing Task 2 band descriptors across four dimensions (0–9, use 0.5 steps):
- Task Response: does it fully address the prompt with a clear position and developed ideas?
- Coherence & Cohesion: logical progression, paragraphing, cohesive devices.
- Lexical Resource: range, precision, collocation, naturalness (native-ness).
- Grammatical Range & Accuracy: variety of structures and error density.
Band reference: 6 = competent but with noticeable errors / limited range; 7 = good control, some flexibility, occasional errors that don't impede communication; 8 = wide range, rare errors, very natural.

Rules for your response:
1. Only include corrections and upgrades that are genuinely worth it. Cap each at ~8 items. Do not nitpick.
2. "corrections" = objective errors (grammar, collocation, spelling, register, punctuation). "upgrades" = phrases that are already correct but could be more natural / native / precise — this is the key to breaking past a plateau.
3. Write ALL explanations, reasons, notes, and comments in Traditional Chinese (繁體中文), because that is the learner's native language. Keep the English examples/suggestions in English.
4. In "structure", judge whether the argument skeleton contains a clear claim, supporting evidence, reasoning that links evidence to claim, and any rebuttal/counter-argument handling.
5. Also give a TOEIC Writing estimate on a 0–200 scale.
6. If the essay is very short or off-topic, still score it and explain why in the notes.
7. Output ONLY valid JSON that conforms exactly to the provided schema. No markdown, no extra prose.`;

export function buildUserPrompt(input: {
  content: string;
  promptTitle?: string;
  promptBody?: string;
  type?: string;
}): string {
  const parts: string[] = [];
  if (input.promptTitle || input.promptBody) {
    parts.push("=== WRITING PROMPT ===");
    if (input.type) parts.push(`Type: ${input.type}`);
    if (input.promptTitle) parts.push(`Title: ${input.promptTitle}`);
    if (input.promptBody) parts.push(input.promptBody);
    parts.push("");
  } else {
    parts.push("=== NO SPECIFIC PROMPT (free writing) ===\n");
  }
  parts.push("=== STUDENT ESSAY ===");
  parts.push(input.content);
  parts.push("");
  parts.push(
    "Give your feedback as JSON following the schema. Remember: explanations in Traditional Chinese, examples in English."
  );
  return parts.join("\n");
}
