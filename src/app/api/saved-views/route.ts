import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

/**
 * GET  /api/saved-views       — Alle gespeicherten Ansichten des Users
 * POST /api/saved-views       — Neue Ansicht speichern
 */

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // @ts-ignore – SavedView model added in Sprint FZ migration
    const views = await (prisma as any).savedView.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(views);
  } catch (error) {
    console.error("[GET /api/saved-views]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, filterRaw, icon } = body;

    if (!name?.trim() || !filterRaw?.trim()) {
      return NextResponse.json({ error: "Name und Filter erforderlich" }, { status: 400 });
    }

    // @ts-ignore
    const view = await (prisma as any).savedView.create({
      data: {
        userId: user.id,
        name: name.trim(),
        filterRaw: filterRaw.trim(),
        icon: icon ?? null,
      },
    });

    return NextResponse.json(view, { status: 201 });
  } catch (error) {
    console.error("[POST /api/saved-views]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
