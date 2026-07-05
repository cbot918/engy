import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const prompts = await prisma.prompt.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ prompts });
}
