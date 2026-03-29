import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createHash } from "crypto";

// POST /api/projects/[id]/share — Erstellt einen öffentlichen Share-Link
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const expiresInDays: number | null = body.expiresInDays ?? null;
    const label: string | undefined = body.label;
    const showTimeTracking: boolean = body.showTimeTracking ?? false;
    const showCosts: boolean = body.showCosts ?? false;
    const password: string | undefined = body.password;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const passwordHash = password
      ? createHash("sha256").update(password).digest("hex")
      : null;

    const share = await prisma.projectShare.create({
      data: {
        projectId: id,
        ...(expiresAt ? { expiresAt } : {}),
        ...(label ? { label } : {}),
        showTimeTracking,
        showCosts,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    return NextResponse.json({
      token: share.token,
      shareUrl: `/share/${share.token}`,
      fullUrl: `${baseUrl}/share/${share.token}`,
      id: share.id,
    });
  } catch (error) {
    console.error("[POST /api/projects/[id]/share]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// GET /api/projects/[id]/share — Gibt alle aktiven Share-Links zurück
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const shares = await prisma.projectShare.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        label: true,
        expiresAt: true,
        showTimeTracking: true,
        showCosts: true,
        passwordHash: true,
        createdAt: true,
        _count: { select: { guestComments: true } },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    return NextResponse.json({
      shares: shares.map((s) => ({
        ...s,
        hasPassword: !!s.passwordHash,
        passwordHash: undefined,
        shareUrl: `/share/${s.token}`,
        fullUrl: `${baseUrl}/share/${s.token}`,
        commentCount: s._count.guestComments,
      })),
    });
  } catch (error) {
    console.error("[GET /api/projects/[id]/share]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PATCH /api/projects/[id]/share — Aktualisiert einen Share-Link
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { shareId, label, showTimeTracking, showCosts, expiresAt, password, removePassword } = body;

    if (!shareId) return NextResponse.json({ error: "shareId fehlt" }, { status: 400 });

    const existing = await prisma.projectShare.findFirst({
      where: { id: shareId, projectId: id },
    });
    if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const passwordHash = password
      ? createHash("sha256").update(password).digest("hex")
      : removePassword
      ? null
      : undefined;

    const updated = await prisma.projectShare.update({
      where: { id: shareId },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(showTimeTracking !== undefined ? { showTimeTracking } : {}),
        ...(showCosts !== undefined ? { showCosts } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
    });

    return NextResponse.json({ success: true, share: updated });
  } catch (error) {
    console.error("[PATCH /api/projects/[id]/share]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/share — Löscht Share-Links des Projekts
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.token) {
      await prisma.projectShare.deleteMany({
        where: { projectId: id, token: body.token },
      });
    } else if (body.shareId) {
      await prisma.projectShare.deleteMany({
        where: { projectId: id, id: body.shareId },
      });
    } else {
      await prisma.projectShare.deleteMany({ where: { projectId: id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]/share]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
