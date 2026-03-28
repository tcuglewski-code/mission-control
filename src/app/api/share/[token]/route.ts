import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, isWithinInterval } from "date-fns";

// GET /api/share/[token] — Öffentliche API, kein Login nötig
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const share = await prisma.projectShare.findUnique({ where: { token } });
    if (!share) {
      return NextResponse.json({ error: "Link nicht gefunden oder abgelaufen" }, { status: 404 });
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: "Dieser Link ist abgelaufen" }, { status: 410 });
    }

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const weekInterval = { start: sevenDaysAgo, end: now };

    const project = await prisma.project.findUnique({
      where: { id: share.projectId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            updatedAt: true,
            createdAt: true,
            assignee: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        milestones: {
          select: {
            id: true,
            title: true,
            status: true,
            progress: true,
            dueDate: true,
            color: true,
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        },
        members: {
          include: {
            user: { select: { name: true, role: true } },
          },
        },
        logs: {
          select: {
            id: true,
            action: true,
            entityType: true,
            entityName: true,
            createdAt: true,
            // Keine userId/userEmail in der öffentlichen Ansicht
          },
          where: {
            // Keine internen Kommentare
            action: { not: "commented" },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    // Task-Statistiken
    const totalTasks = project.tasks.length;
    const doneTasks = project.tasks.filter((t) => t.status === "done").length;
    const openTasks = project.tasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled"
    ).length;

    // Letzte Aktivitäten (ohne interne Kommentare)
    const recentActivities = project.logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityName: l.entityName,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress,
        color: project.color,
        createdAt: project.createdAt,
      },
      stats: {
        totalTasks,
        doneTasks,
        openTasks,
      },
      milestones: project.milestones,
      recentActivities,
      team: project.members.map((m) => ({
        name: m.user.name,
        role: m.role,
      })),
      shareToken: token,
      expiresAt: share.expiresAt,
    });
  } catch (error) {
    console.error("[GET /api/share/[token]]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
