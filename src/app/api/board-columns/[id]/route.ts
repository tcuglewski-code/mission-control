import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Nur Admins können Spalten bearbeiten" }, { status: 403 });
    }

    const body = await req.json();
    const { name, statusKey, order, wipLimit, color } = body;

    const column = await prisma.boardColumn.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(statusKey !== undefined && { statusKey }),
        ...(order !== undefined && { order: parseInt(String(order)) }),
        ...(wipLimit !== undefined && {
          wipLimit: wipLimit === null ? null : parseInt(String(wipLimit)),
        }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error("[PATCH /api/board-columns/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Nur Admins können Spalten löschen" }, { status: 403 });
    }

    await prisma.boardColumn.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/board-columns/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
