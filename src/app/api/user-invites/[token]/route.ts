import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface RouteContext {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/user-invites/[token]
 * Prüft ob ein Einladungstoken gültig ist.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const invite = await prisma.userInvite.findUnique({ where: { token } });

  if (!invite) {
    return NextResponse.json({ error: "Ungültiger Einladungslink" }, { status: 404 });
  }

  if (invite.used) {
    return NextResponse.json({ error: "Einladung bereits verwendet" }, { status: 400 });
  }

  if (new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "Einladungslink abgelaufen" }, { status: 400 });
  }

  return NextResponse.json({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
  });
}

/**
 * POST /api/user-invites/[token]
 * Erstellt einen Account über einen Einladungslink.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { token } = await params;

  const invite = await prisma.userInvite.findUnique({ where: { token } });

  if (!invite || invite.used || new Date() > invite.expiresAt) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Einladungslink" }, { status: 400 });
  }

  const body = await req.json();
  const { username, password, name } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "Benutzername und Passwort erforderlich" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });
  }

  const exists = await prisma.authUser.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ error: "Benutzername bereits vergeben" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.authUser.create({
    data: {
      username,
      email: invite.email,
      passwordHash,
      role: invite.role === "admin" ? "admin" : "user",
      mcRole: invite.role,
      projectAccess: [],
    },
  });

  // Einladung als verwendet markieren
  await prisma.userInvite.update({
    where: { token },
    data: { used: true },
  });

  return NextResponse.json({ success: true });
}
