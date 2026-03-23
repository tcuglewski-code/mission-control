import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerWebhooks } from "@/lib/webhooks";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Non-admins can only access tasks in their allowed projects
    if (user.role !== "admin" && task.projectId && !user.projectAccess.includes(task.projectId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[GET /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function updateTask(id: string, body: Record<string, unknown>) {
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
    timeSpentSeconds,
  } = body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    labels?: string;
    dueDate?: string | null;
    startDate?: string | null;
    agentPrompt?: string | null;
    projectId?: string | null;
    assigneeId?: string | null;
    sprintId?: string | null;
    timeSpentSeconds?: number;
  };

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(labels !== undefined && { labels }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(agentPrompt !== undefined && { agentPrompt: agentPrompt || null }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      ...(sprintId !== undefined && { sprintId: sprintId || null }),
      ...(timeSpentSeconds !== undefined && { timeSpentSeconds }),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
      sprint: { select: { id: true, name: true } },
    },
  });

  if (status !== undefined) {
    await prisma.activityLog.create({
      data: {
        action: status === "done" ? "completed" : "updated",
        entityType: "task",
        entityId: task.id,
        entityName: task.title,
        projectId: task.projectId,
        metadata: JSON.stringify({ field: "status", to: status }),
      },
    });

    // Auto-recalculate project progress
    if (task.projectId) {
      const allTasks = await prisma.task.findMany({
        where: { projectId: task.projectId },
        select: { status: true },
      });
      const totalTasks = allTasks.length;
      const doneTasks = allTasks.filter((t) => t.status === "done").length;
      const progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
      await prisma.project.update({
        where: { id: task.projectId },
        data: { progress },
      });
    }
  }

  return task;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
    triggerWebhooks("task.updated", { task }, task.projectId ?? undefined);
    return NextResponse.json(task);
  } catch (error) {
    console.error("[PUT /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
    triggerWebhooks("task.updated", { task }, task.projectId ?? undefined);
    return NextResponse.json(task);
  } catch (error) {
    console.error("[PATCH /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.TASKS_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    triggerWebhooks("task.deleted", { taskId: id, title: task.title }, task.projectId ?? undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
