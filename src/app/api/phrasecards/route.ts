import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const BodySchema = z.object({
  original: z.string().min(1),
  upgraded: z.string().min(1),
  note: z.string().default(""),
  essayId: z.string().optional(),
});

export async function GET() {
  const cards = await prisma.phraseCard.findMany({
    orderBy: { dueAt: "asc" },
  });
  return NextResponse.json({ cards });
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

  const card = await prisma.phraseCard.create({ data: body });
  return NextResponse.json({ card });
}
