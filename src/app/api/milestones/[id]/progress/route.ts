import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

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
        tasks: {
          select: { id: true, status: true, title: true },
        },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Meilenstein nicht gefunden" }, { status: 404 });
    }

    const tasks = milestone.tasks ?? [];
    const totalTasks = tasks.length;
    const tasksByStatus = {
      backlog: tasks.filter((t) => t.status === "backlog").length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      in_review: tasks.filter((t) => t.status === "in_review").length,
      done: tasks.filter((t) => t.status === "done").length,
    };

    const calculatedProgress = totalTasks > 0 
      ? Math.round((tasksByStatus.done / totalTasks) * 100) 
      : 0;

    return NextResponse.json({
      milestoneId: id,
      title: milestone.title,
      manualProgress: milestone.progress,
      calculatedProgress,
      totalTasks,
      tasksByStatus,
      isOnTrack: milestone.dueDate 
        ? new Date(milestone.dueDate) >= new Date() || milestone.status === "completed"
        : true,
    });
  } catch (error) {
    console.error("[GET /api/milestones/[id]/progress]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
