import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerWebhooks } from "@/lib/webhooks";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    // BUG FIX: Non-admins sehen NUR Tasks aus explizit freigegebenen Projekten.
    // Leeres projectAccess-Array = keine Tasks sichtbar.
    const accessFilter =
      user.role !== "admin"
        ? { projectId: { in: user.projectAccess } }
        : {};

    const tasks = await prisma.task.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...accessFilter,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_CREATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      status,
      priority,
      labels,
      dueDate,
      projectId,
      assigneeId,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status ?? "backlog",
        priority: priority ?? "medium",
        labels,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        assigneeId: assigneeId || null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "task",
        entityId: task.id,
        entityName: task.title,
        projectId: task.projectId,
      },
    });

    triggerWebhooks("task.created", { task }, task.projectId ?? undefined);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
