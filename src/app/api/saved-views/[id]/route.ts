import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

/**
 * DELETE /api/saved-views/[id]  — Ansicht löschen
 * PATCH  /api/saved-views/[id]  — Ansicht umbenennen
 */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore
    await (prisma as any).savedView.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/saved-views/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, filterRaw, icon } = body;

    // @ts-ignore
    const view = await (prisma as any).savedView.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(filterRaw ? { filterRaw: filterRaw.trim() } : {}),
        ...(icon !== undefined ? { icon } : {}),
      },
    });

    return NextResponse.json(view);
  } catch (error) {
    console.error("[PATCH /api/saved-views/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
