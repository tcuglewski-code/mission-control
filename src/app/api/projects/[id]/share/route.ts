import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

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

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const share = await prisma.projectShare.create({
      data: {
        projectId: id,
        ...(expiresAt ? { expiresAt } : {}),
      },
    });

    return NextResponse.json({ token: share.token, shareUrl: `/share/${share.token}` });
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
    });

    return NextResponse.json({ shares });
  } catch (error) {
    console.error("[GET /api/projects/[id]/share]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/share — Löscht alle Share-Links des Projekts
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
    } else {
      await prisma.projectShare.deleteMany({ where: { projectId: id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/projects/[id]/share]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
