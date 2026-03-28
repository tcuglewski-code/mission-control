import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerWebhooks } from "@/lib/webhooks";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/audit";

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
    const accessFilter =
      user.role !== "admin"
        ? { projectId: { in: user.projectAccess } }
        : {};
    const sprintId = searchParams.get("sprintId");

    const tasks = await prisma.task.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...accessFilter,
        ...(sprintId === "null" ? { sprintId: null } : sprintId ? { sprintId } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
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
      startDate,
      agentPrompt,
      projectId,
      assigneeId,
      sprintId,
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
        startDate: startDate ? new Date(startDate) : null,
        agentPrompt: agentPrompt || null,
        projectId: projectId || null,
        assigneeId: assigneeId || null,
        sprintId: sprintId || null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
      },
    });

    await logActivity({
      userId:       user.id,
      userEmail:    user.email,
      action:       "created",
      resource:     "task",
      resourceId:   task.id,
      resourceName: task.title,
      projectId:    task.projectId ?? undefined,
      details:      { status: task.status, priority: task.priority },
    });

    triggerWebhooks("task.created", { task }, task.projectId ?? undefined);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tasks]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
