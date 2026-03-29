import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/authHelpers";

// POST /api/deals/[id]/activities — Neue Aktivität hinzufügen
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionOrApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { type, content, metadata } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: "Typ und Inhalt sind erforderlich" },
        { status: 400 }
      );
    }

    // Prüfen ob Deal existiert
    const deal = await prisma.deal.findUnique({ where: { id } });
    if (!deal) {
      return NextResponse.json({ error: "Deal nicht gefunden" }, { status: 404 });
    }

    const activity = await prisma.dealActivity.create({
      data: {
        dealId: id,
        type,
        content,
        authorName: auth.user?.name ?? "System",
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Deal updatedAt aktualisieren
    await prisma.deal.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error: any) {
    console.error("Error creating activity:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
