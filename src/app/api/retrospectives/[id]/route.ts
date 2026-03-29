import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const retro = await prisma.retrospective.findUnique({
      where: { id },
      include: { items: { orderBy: { votes: "desc" } } },
    });
    if (!retro) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(retro);
  } catch (error) {
    console.error("[GET /api/retrospectives/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
