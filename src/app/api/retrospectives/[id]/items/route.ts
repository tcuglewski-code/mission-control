import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: retroId } = await params;
    const { type, text } = await req.json() as { type: string; text: string };

    if (!type || !text?.trim()) {
      return NextResponse.json({ error: "type and text required" }, { status: 400 });
    }

    const item = await prisma.retroItem.create({
      data: { retroId, type, text: text.trim() },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[POST /api/retrospectives/[id]/items]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
