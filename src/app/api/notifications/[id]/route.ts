import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// PATCH /api/notifications/[id] — als gelesen markieren
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }
    if (notification.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/notifications/[id]]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] — Benachrichtigung löschen
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }
    if (notification.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.notification.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/notifications/[id]]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
