import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// POST /api/tasks/[id]/labels — Label zu Task hinzufügen
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const { labelId } = body;

    if (!labelId) {
      return NextResponse.json({ error: "labelId required" }, { status: 400 });
    }

    await prisma.taskLabel.upsert({
      where: { taskId_labelId: { taskId, labelId } },
      create: { taskId, labelId },
      update: {},
    });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        taskLabels: { include: { label: true } },
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[POST /api/tasks/[id]/labels]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/tasks/[id]/labels — Labels eines Tasks
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const taskLabels = await prisma.taskLabel.findMany({
      where: { taskId },
      include: { label: true },
    });

    return NextResponse.json(taskLabels.map((tl) => tl.label));
  } catch (error) {
    console.error("[GET /api/tasks/[id]/labels]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
