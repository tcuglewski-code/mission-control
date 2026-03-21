import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { title, content, type = "note" } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "title and content required" }, { status: 400 });

  const entry = await prisma.memoryEntry.create({
    data: { title, content, type },
  });
  return NextResponse.json(entry);
}
