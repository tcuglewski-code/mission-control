import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

interface RouteContext {
  params: Promise<{ id: string; userId: string }>;
}

/**
 * PUT /api/projects/[id]/members/[userId]
 * Ändert die Rolle eines Projektmitglieds.
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionOrApiKey(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId, userId } = await params;

  // Prüfe Berechtigung
  if (session.role !== "admin") {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.id } },
    });
    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Nur Admin oder Projekt-Owner können Rollen ändern" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { role } = body;

  const validRoles = ["owner", "editor", "viewer"];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json({ error: "Ungültige Rolle. Erlaubt: owner, editor, viewer" }, { status: 400 });
  }

  try {
    const updated = await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });
  }
}

/**
 * DELETE /api/projects/[id]/members/[userId]
 * Entfernt einen Mitarbeiter aus dem Projekt.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionOrApiKey(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId, userId } = await params;

  // Prüfe Berechtigung
  if (session.role !== "admin") {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.id } },
    });
    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Nur Admin oder Projekt-Owner können Mitglieder entfernen" }, { status: 403 });
    }
  }

  try {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });
  }
}
