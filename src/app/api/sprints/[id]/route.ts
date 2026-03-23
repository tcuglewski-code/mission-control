import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: {
          include: {
            project: { select: { id: true, name: true, color: true } },
            assignee: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("[GET /api/sprints/[id]]", error);
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
    const { name, description, goal, startDate, endDate, projectId, status } = body as {
      name?: string;
      description?: string;
      goal?: string;
      startDate?: string | null;
      endDate?: string | null;
      projectId?: string | null;
      status?: string;
    };

    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(goal !== undefined && { goal: goal?.trim() || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(status !== undefined && { status }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: { select: { id: true, status: true, title: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "updated",
        entityType: "sprint",
        entityId: sprint.id,
        entityName: sprint.name,
        projectId: sprint.projectId,
        metadata: JSON.stringify({ fields: Object.keys(body) }),
      },
    });

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("[PATCH /api/sprints/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sprint = await prisma.sprint.findUnique({ where: { id } });
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Detach tasks from sprint before deleting
    await prisma.task.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    });

    await prisma.sprint.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        action: "deleted",
        entityType: "sprint",
        entityId: id,
        entityName: sprint.name,
        projectId: sprint.projectId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/sprints/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
