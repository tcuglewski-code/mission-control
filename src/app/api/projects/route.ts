import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // BUG FIX: Non-admins sehen NUR explizit freigegebene Projekte.
    // Leeres projectAccess-Array = kein Projektzugang (nicht alle Projekte!).
    const accessFilter =
      user.role !== "admin"
        ? { id: { in: user.projectAccess } }
        : undefined;

    const projects = await prisma.project.findMany({
      where: {
        ...(status && status !== "all" ? { status } : {}),
        ...accessFilter,
      },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, status, progress, priority, color, clientId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: status ?? "planning",
        progress: progress ?? 0,
        priority: priority ?? "medium",
        color: color ?? "#3b82f6",
        clientId: clientId || null,
      },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "project",
        entityId: project.id,
        entityName: project.name,
        projectId: project.id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
