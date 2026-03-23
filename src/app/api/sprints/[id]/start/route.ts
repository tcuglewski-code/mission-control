import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.sprint.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    if (existing.status === "active") {
      return NextResponse.json({ error: "Sprint is already active" }, { status: 400 });
    }

    // Move todo/backlog tasks to in_progress
    await prisma.task.updateMany({
      where: {
        sprintId: id,
        status: { in: ["todo", "backlog"] },
      },
      data: { status: "in_progress" },
    });

    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        status: "active",
        startDate: existing.startDate ?? new Date(),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: { select: { id: true, status: true, title: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "started",
        entityType: "sprint",
        entityId: sprint.id,
        entityName: sprint.name,
        projectId: sprint.projectId,
      },
    });

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("[POST /api/sprints/[id]/start]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
