import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (invitation.usedAt) {
    return NextResponse.json({ error: "Invitation already used" }, { status: 400 });
  }

  if (new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
  }

  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    expiresAt: invitation.expiresAt,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation || invitation.usedAt || new Date() > invitation.expiresAt) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
  }

  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  }

  const exists = await prisma.authUser.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.authUser.create({
    data: {
      username,
      email: invitation.email ?? undefined,
      passwordHash,
      role: "user",
      projectAccess: [],
    },
  });

  await prisma.invitation.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
