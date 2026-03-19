import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
    projectId,
    assigneeId,
    timeSpentSeconds,
  } = body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    labels?: string;
    dueDate?: string | null;
    projectId?: string | null;
    assigneeId?: string | null;
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
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      ...(timeSpentSeconds !== undefined && { timeSpentSeconds }),
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, avatar: true } },
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
  }

  return task;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
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
    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
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
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/tasks/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
