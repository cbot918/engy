import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      taskResponse: true,
      coherenceCohesion: true,
      lexicalResource: true,
      grammaticalRange: true,
      overallBand: true,
      toeicWritingEst: true,
    },
  });
  return NextResponse.json({ feedback });
}
