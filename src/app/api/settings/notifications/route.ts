import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/settings/notifications — aktuelle Einstellungen laden
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await prisma.authUser.findUnique({
      where: { id: user.id },
      select: {
        notifEmailDigest: true,
        notifPush: true,
        notifPrefs: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        digestFrequency: true,
        digestTime: true,
      },
    });

    if (!data) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });

    return NextResponse.json({
      ...data,
      notifPrefs: data.notifPrefs ? JSON.parse(data.notifPrefs) : null,
    });
  } catch (error) {
    console.error("[GET /api/settings/notifications]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PATCH /api/settings/notifications — Einstellungen speichern
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      notifEmailDigest,
      notifPush,
      notifPrefs,
      quietHoursStart,
      quietHoursEnd,
      digestFrequency,
      digestTime,
    } = body;

    const updateData: Record<string, unknown> = {};
    if (notifEmailDigest !== undefined) updateData.notifEmailDigest = Boolean(notifEmailDigest);
    if (notifPush !== undefined) updateData.notifPush = Boolean(notifPush);
    if (notifPrefs !== undefined) updateData.notifPrefs = JSON.stringify(notifPrefs);
    if (quietHoursStart !== undefined) updateData.quietHoursStart = Number(quietHoursStart);
    if (quietHoursEnd !== undefined) updateData.quietHoursEnd = Number(quietHoursEnd);
    if (digestFrequency !== undefined) updateData.digestFrequency = String(digestFrequency);
    if (digestTime !== undefined) updateData.digestTime = String(digestTime);

    const updated = await prisma.authUser.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        notifEmailDigest: true,
        notifPush: true,
        notifPrefs: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        digestFrequency: true,
        digestTime: true,
      },
    });

    return NextResponse.json({
      ...updated,
      notifPrefs: updated.notifPrefs ? JSON.parse(updated.notifPrefs) : null,
    });
  } catch (error) {
    console.error("[PATCH /api/settings/notifications]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
