import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get("sprintId");

    const retros = await prisma.retrospective.findMany({
      where: sprintId ? { sprintId } : {},
      include: { items: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(retros);
  } catch (error) {
    console.error("[GET /api/retrospectives]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sprintId } = await req.json() as { sprintId: string };

    if (!sprintId) {
      return NextResponse.json({ error: "sprintId required" }, { status: 400 });
    }

    const existing = await prisma.retrospective.findUnique({ where: { sprintId } });
    if (existing) {
      return NextResponse.json(existing);
    }

    const retro = await prisma.retrospective.create({
      data: { sprintId },
      include: { items: true },
    });

    return NextResponse.json(retro, { status: 201 });
  } catch (error) {
    console.error("[POST /api/retrospectives]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
