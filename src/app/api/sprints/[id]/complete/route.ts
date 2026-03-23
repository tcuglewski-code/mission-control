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

    if (existing.status === "completed") {
      return NextResponse.json({ error: "Sprint is already completed" }, { status: 400 });
    }

    const sprint = await prisma.sprint.update({
      where: { id },
      data: {
        status: "completed",
        endDate: existing.endDate ?? new Date(),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: { select: { id: true, status: true, title: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "completed",
        entityType: "sprint",
        entityId: sprint.id,
        entityName: sprint.name,
        projectId: sprint.projectId,
      },
    });

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("[POST /api/sprints/[id]/complete]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
