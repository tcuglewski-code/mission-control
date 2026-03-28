import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/audit";

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
    const projectId = searchParams.get("projectId");

    const accessFilter =
      user.role !== "admin"
        ? { projectId: { in: user.projectAccess } }
        : {};

    const milestones = await prisma.milestone.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...accessFilter,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
        tasks: {
          select: { id: true, status: true },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });

    const milestonesWithProgress = milestones.map((m) => {
      const totalTasks = m.tasks.length;
      const doneTasks = m.tasks.filter((t) => t.status === "done").length;
      const calculatedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      return {
        ...m,
        calculatedProgress,
        taskStats: {
          total: totalTasks,
          done: doneTasks,
        },
      };
    });

    return NextResponse.json(milestonesWithProgress);
  } catch (error) {
    console.error("[GET /api/milestones]", error);
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
    const { title, description, status, progress, color, dueDate, projectId } = body;

    if (!title) {
      return NextResponse.json({ error: "Titel ist erforderlich" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "Projekt ist erforderlich" }, { status: 400 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        title,
        description: description || null,
        status: status ?? "planned",
        progress: progress ?? 0,
        color: color ?? "#8b5cf6",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
      },
    });

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      action: "created",
      resource: "milestone",
      resourceId: milestone.id,
      resourceName: milestone.title,
      projectId: milestone.projectId,
      details: { status: milestone.status },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error("[POST /api/milestones]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
