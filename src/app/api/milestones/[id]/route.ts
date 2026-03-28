import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/audit";
import { triggerWebhooks } from "@/lib/webhooks";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Meilenstein nicht gefunden" }, { status: 404 });
    }

    const totalTasks = milestone.tasks.length;
    const doneTasks = milestone.tasks.filter((t) => t.status === "done").length;
    const calculatedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      ...milestone,
      calculatedProgress,
      taskStats: { total: totalTasks, done: doneTasks },
    });
  } catch (error) {
    console.error("[GET /api/milestones/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, description, status, progress, color, dueDate } = body;

    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Meilenstein nicht gefunden" }, { status: 404 });
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(progress !== undefined && { progress }),
        ...(color !== undefined && { color }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
      },
    });

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      action: "updated",
      resource: "milestone",
      resourceId: milestone.id,
      resourceName: milestone.title,
      projectId: milestone.projectId,
      details: { status: milestone.status },
    });

    // Webhook: Meilenstein als abgeschlossen markiert
    if (status === "completed" && existing.status !== "completed") {
      triggerWebhooks("milestone.completed", { milestone }, milestone.projectId ?? undefined);
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("[PATCH /api/milestones/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Meilenstein nicht gefunden" }, { status: 404 });
    }

    await prisma.task.updateMany({
      where: { milestoneId: id },
      data: { milestoneId: null },
    });

    await prisma.milestone.delete({ where: { id } });

    await logActivity({
      userId: user.id,
      userEmail: user.email,
      action: "deleted",
      resource: "milestone",
      resourceId: id,
      resourceName: existing.title,
      projectId: existing.projectId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/milestones/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
