import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerWebhooks } from "@/lib/webhooks";
import { getSessionOrApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const projectId = searchParams.get("projectId");

    // Project access filtering — supports both session and API key auth
    const user = await getSessionOrApiKey(req);
    const userRole = user?.role;
    const projectAccess: string[] = user?.projectAccess ?? [];

    const accessFilter =
      userRole === "user" && projectAccess.length > 0
        ? { projectId: { in: projectAccess } }
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
