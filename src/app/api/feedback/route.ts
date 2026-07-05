import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getFeedback } from "@/lib/feedback";

const BodySchema = z.object({
  content: z.string().min(1, "內容不可為空"),
  promptId: z.string().optional(),
  durationSec: z.number().int().positive().optional(),
});

function countWords(text: string): number {
  const m = text.trim().match(/\b[\w'-]+\b/g);
  return m ? m.length : 0;
}

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "請求格式錯誤", detail: (err as Error).message },
      { status: 400 }
    );
  }

  const prompt = body.promptId
    ? await prisma.prompt.findUnique({ where: { id: body.promptId } })
    : null;

  const essay = await prisma.essay.create({
    data: {
      promptId: prompt?.id,
      content: body.content,
      wordCount: countWords(body.content),
      durationSec: body.durationSec,
    },
  });

  try {
    const { result, model, raw } = await getFeedback({
      content: body.content,
      promptTitle: prompt?.title,
      promptBody: prompt?.body,
      type: prompt?.type,
    });

    await prisma.feedback.create({
      data: {
        essayId: essay.id,
        model,
        raw,
        taskResponse: result.scores.taskResponse,
        coherenceCohesion: result.scores.coherenceCohesion,
        lexicalResource: result.scores.lexicalResource,
        grammaticalRange: result.scores.grammaticalRange,
        overallBand: result.scores.overallBand,
        toeicWritingEst: result.scores.toeicWritingEstimate,
      },
    });

    return NextResponse.json({ essayId: essay.id, feedback: result });
  } catch (err) {
    console.error("[/api/feedback] AI 回饋失敗:", err);
    // 作文已存，回傳 essayId 讓前端可重試
    return NextResponse.json(
      {
        error: "AI 回饋失敗，請確認 OPENROUTER_API_KEY 與模型設定後重試",
        detail: (err as Error).message,
        essayId: essay.id,
      },
      { status: 500 }
    );
  }
}
