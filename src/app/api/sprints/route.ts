import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const sprints = await prisma.sprint.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: {
          select: { id: true, status: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sprints);
  } catch (error) {
    console.error("[GET /api/sprints]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, goal, startDate, endDate, projectId } = body as {
      name: string;
      description?: string;
      goal?: string;
      startDate?: string;
      endDate?: string;
      projectId?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const sprint = await prisma.sprint.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        goal: goal?.trim() || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId: projectId || null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        tasks: { select: { id: true, status: true, title: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "created",
        entityType: "sprint",
        entityId: sprint.id,
        entityName: sprint.name,
        projectId: sprint.projectId,
      },
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    console.error("[POST /api/sprints]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
