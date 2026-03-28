import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

/**
 * GET /api/settings/profile
 * Returns the current user's profile data.
 */
export async function GET(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const user = await prisma.authUser.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    mcRole: (user as any).mcRole ?? "entwickler",
    active: (user as any).active ?? true,
    notifEmailDigest: (user as any).notifEmailDigest ?? true,
    notifPush: (user as any).notifPush ?? false,
    createdAt: user.createdAt,
  });
}

/**
 * PATCH /api/settings/profile
 * Update current user's profile (name, email, notification settings).
 */
export async function PATCH(req: NextRequest) {
  const session = await getSessionOrApiKey(req);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await req.json();
  const { username, email, notifEmailDigest, notifPush } = body;

  const updateData: Record<string, unknown> = {};

  if (username !== undefined) {
    if (username.trim().length < 2) {
      return NextResponse.json({ error: "Name muss mindestens 2 Zeichen lang sein" }, { status: 400 });
    }
    // Check if username is taken by another user
    const existing = await prisma.authUser.findFirst({
      where: { username: username.trim(), NOT: { id: session.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Benutzername bereits vergeben" }, { status: 400 });
    }
    updateData.username = username.trim();
  }

  if (email !== undefined) {
    updateData.email = email || null;
  }

  if (notifEmailDigest !== undefined) {
    updateData.notifEmailDigest = notifEmailDigest;
  }

  if (notifPush !== undefined) {
    updateData.notifPush = notifPush;
  }

  try {
    const updated = await prisma.authUser.update({
      where: { id: session.id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      mcRole: (updated as any).mcRole ?? "entwickler",
      notifEmailDigest: (updated as any).notifEmailDigest ?? true,
      notifPush: (updated as any).notifPush ?? false,
    });
  } catch (e) {
    console.error("[settings/profile] PATCH error:", e);
    return NextResponse.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}
