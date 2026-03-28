import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/members
 * Gibt alle Projektmitglieder zurück.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const user = await getSessionOrApiKey(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const members = await prisma.projectMember.findMany({
    where: { projectId: id },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

/**
 * POST /api/projects/[id]/members
 * Fügt einen neuen Mitarbeiter zum Projekt hinzu.
 * Nur Admin oder Projekt-Owner darf das.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionOrApiKey(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  // Prüfe ob Admin oder Projekt-Owner
  if (session.role !== "admin") {
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.id } },
    });
    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Nur Admin oder Projekt-Owner können Mitglieder verwalten" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { userId, role = "viewer" } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId erforderlich" }, { status: 400 });
  }

  const validRoles = ["owner", "editor", "viewer"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Ungültige Rolle. Erlaubt: owner, editor, viewer" }, { status: 400 });
  }

  // Prüfe ob User existiert
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  }

  try {
    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role },
      update: { role },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
      },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        action: "member_added",
        entityType: "project",
        entityId: projectId,
        entityName: targetUser.name,
        userId: session.id,
        projectId,
        metadata: JSON.stringify({ role, targetUserId: userId }),
      },
    }).catch(() => {});

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects/[id]/members]", error);
    return NextResponse.json({ error: "Fehler beim Hinzufügen des Mitglieds" }, { status: 500 });
  }
}
