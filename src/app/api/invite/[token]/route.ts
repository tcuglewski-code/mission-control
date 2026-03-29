import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    console.log("[GET /api/invite/[token]] Looking up token:", token?.slice(0, 8) + "...");

    // Zuerst UserInvite (neues System) prüfen
    const userInvite = await prisma.userInvite.findUnique({ where: { token } }).catch(() => null);
    if (userInvite) {
      if (userInvite.used) {
        return NextResponse.json({ error: "Einladung bereits verwendet" }, { status: 400 });
      }
      if (new Date() > userInvite.expiresAt) {
        return NextResponse.json({ error: "Einladungslink abgelaufen" }, { status: 400 });
      }
      return NextResponse.json({
        id: userInvite.id,
        email: userInvite.email,
        role: userInvite.role,
        expiresAt: userInvite.expiresAt,
      });
    }

    // Fallback: Altes Invitation-System
    const invitation = await prisma.invitation.findUnique({ where: { token } });

    if (!invitation) {
      console.log("[GET /api/invite/[token]] Token not found in DB");
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (invitation.usedAt) {
      console.log("[GET /api/invite/[token]] Token already used:", invitation.usedAt);
      return NextResponse.json({ error: "Invitation already used" }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      console.log("[GET /api/invite/[token]] Token expired at:", invitation.expiresAt);
      return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: (invitation as any).role ?? "entwickler",
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("[GET /api/invite/[token]] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    console.log("[POST /api/invite/[token]] Registering with token:", token?.slice(0, 8) + "...");

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "username and password required" }, { status: 400 });
    }

    // Zuerst UserInvite (neues System) prüfen
    const userInvite = await prisma.userInvite.findUnique({ where: { token } }).catch(() => null);
    if (userInvite) {
      if (userInvite.used || new Date() > userInvite.expiresAt) {
        return NextResponse.json({ error: "Ungültiger oder abgelaufener Einladungslink" }, { status: 400 });
      }
      const exists = await prisma.authUser.findUnique({ where: { username } });
      if (exists) return NextResponse.json({ error: "Benutzername bereits vergeben" }, { status: 400 });

      const passwordHash = await bcrypt.hash(password, 12);
      await prisma.authUser.create({
        data: {
          username,
          email: userInvite.email,
          passwordHash,
          role: userInvite.role === "admin" ? "admin" : "user",
          mcRole: userInvite.role,
          projectAccess: [],
        },
      });
      await prisma.userInvite.update({ where: { token }, data: { used: true } });
      return NextResponse.json({ success: true });
    }

    // Fallback: Altes Invitation-System
    const invitation = await prisma.invitation.findUnique({ where: { token } });

    if (!invitation) {
      console.log("[POST /api/invite/[token]] Token not found in DB");
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    if (invitation.usedAt) {
      return NextResponse.json({ error: "Invitation already used" }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
    }

    const exists = await prisma.authUser.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const invRole = (invitation as any).role ?? "entwickler";

    await prisma.authUser.create({
      data: {
        username,
        email: invitation.email ?? undefined,
        passwordHash,
        role: invRole === "admin" ? "admin" : "user",
        mcRole: invRole,
        projectAccess: [],
      },
    });

    await prisma.invitation.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/invite/[token]] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
