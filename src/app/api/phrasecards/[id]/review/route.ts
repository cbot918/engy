import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { nextReview } from "@/lib/srs";

const BodySchema = z.object({
  grade: z.number().int().min(0).max(3),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "請求格式錯誤", detail: (err as Error).message },
      { status: 400 }
    );
  }

  const card = await prisma.phraseCard.findUnique({ where: { id } });
  if (!card) {
    return NextResponse.json({ error: "卡片不存在" }, { status: 404 });
  }

  const next = nextReview(
    { interval: card.interval, ease: card.ease, reps: card.reps },
    body.grade
  );

  const updated = await prisma.phraseCard.update({
    where: { id },
    data: {
      interval: next.interval,
      ease: next.ease,
      reps: next.reps,
      dueAt: next.dueAt,
    },
  });

  return NextResponse.json({ card: updated });
}
