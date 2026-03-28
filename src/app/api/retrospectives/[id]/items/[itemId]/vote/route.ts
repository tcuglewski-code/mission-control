import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const { delta } = await req.json() as { delta: 1 | -1 };

    const item = await prisma.retroItem.update({
      where: { id: itemId },
      data: { votes: { increment: delta } },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("[POST /api/retrospectives/[id]/items/[itemId]/vote]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
