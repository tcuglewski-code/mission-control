import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

// POST /api/share/[token]/auth — Passwort-Überprüfung für geschützte Share-Links
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const share = await prisma.projectShare.findUnique({ where: { token } });
    if (!share) {
      return NextResponse.json({ error: "Link nicht gefunden" }, { status: 404 });
    }
    if (!share.passwordHash) {
      return NextResponse.json({ error: "Kein Passwortschutz" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Passwort fehlt" }, { status: 400 });
    }

    const hash = createHash("sha256").update(password).digest("hex");
    if (hash !== share.passwordHash) {
      return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
    }

    // Auth-Cookie setzen (HTTP-only für Sicherheit)
    const cookieKey = `share_auth_${share.id}`;
    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieKey, share.passwordHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 Tage
      path: `/share/${token}`,
    });

    return response;
  } catch (error) {
    console.error("[POST /api/share/[token]/auth]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
