import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { requireAdminFromDb } from "@/lib/api-auth";

/**
 * GET /api/admin/invites
 * Listet alle ausstehenden Einladungen.
 */
export async function GET() {
  const admin = await requireAdminFromDb();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invites = await prisma.userInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(invites);
}

/**
 * POST /api/admin/invites
 * Erstellt eine neue Benutzer-Einladung (48h gültig).
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdminFromDb();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { email, role = "entwickler" } = body;

  if (!email) {
    return NextResponse.json({ error: "E-Mail erforderlich" }, { status: 400 });
  }

  const validRoles = ["admin", "projektmanager", "entwickler", "beobachter"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 Stunden

  const invite = await prisma.userInvite.create({
    data: {
      email,
      token,
      role,
      expiresAt,
      createdById: admin.id,
    },
  });

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return NextResponse.json({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt,
    link: `${baseUrl}/invite/${invite.token}`,
  });
}
