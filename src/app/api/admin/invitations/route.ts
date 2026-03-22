import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email } = body;

    // Generate token explicitly — don't rely on DB default
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        token,
        email,
        expiresAt,
        createdById: (session.user as any).id ?? session.user.id!,
      },
    });

    // Fix: correct operator precedence for baseUrl
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const vercelUrl = process.env.VERCEL_URL;
    const baseUrl = nextAuthUrl
      ? nextAuthUrl
      : vercelUrl
      ? `https://${vercelUrl}`
      : "http://localhost:3000";

    return NextResponse.json({
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      link: `${baseUrl}/invite/${invitation.token}`,
    });
  } catch (error) {
    console.error("[POST /api/admin/invitations] Error:", error);
    return NextResponse.json(
      { error: "Failed to create invitation", details: String(error) },
      { status: 500 }
    );
  }
}
