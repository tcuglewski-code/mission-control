import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// PATCH /api/settings/notifications — Benachrichtigungs-Einstellungen speichern
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notifEmailDigest, notifPush } = body;

    const updateData: Record<string, unknown> = {};
    if (notifEmailDigest !== undefined) updateData.notifEmailDigest = Boolean(notifEmailDigest);
    if (notifPush !== undefined) updateData.notifPush = Boolean(notifPush);

    const updated = await prisma.authUser.update({
      where: { id: user.id },
      data: updateData,
      select: { id: true, notifEmailDigest: true, notifPush: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/settings/notifications]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
