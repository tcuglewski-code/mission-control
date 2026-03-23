import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const now = new Date();

    // Update task status to in_progress
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: "in_progress",
        startDate: existing.startDate ?? now,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        sprint: { select: { id: true, name: true } },
      },
    });

    // Create a calendar event for this task start
    await prisma.event.create({
      data: {
        title: `▶ ${task.title}`,
        description: `Task gestartet`,
        type: "task",
        color: "#10b981",
        startTime: now,
        endTime: task.dueDate ?? null,
        taskId: task.id,
      },
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        action: "started",
        entityType: "task",
        entityId: task.id,
        entityName: task.title,
        projectId: task.projectId,
        metadata: JSON.stringify({ startedAt: now.toISOString() }),
      },
    });

    return NextResponse.json({ task, webhookFired: false });
  } catch (error) {
    console.error("[POST /api/tasks/[id]/start]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
