import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { calculateHealthScore } from "@/lib/health-score";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Zugriffsfilter
    const accessFilter =
      user.role !== "admin"
        ? user.projectAccess.length > 0
          ? { projectId: { in: user.projectAccess } }
          : { id: "__none__" }
        : {};

    // Letzte Aktivitäten der letzten Stunde
    const recentLogs = await prisma.activityLog.findMany({
      where: {
        ...accessFilter,
        createdAt: { gte: oneHourAgo },
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        project: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Aktive Nutzer: Wer hat in den letzten 5 Minuten Aktivität gezeigt?
    const activeUserMap = new Map<string, { id: string; name: string; avatar?: string | null; lastAction: string; lastAt: Date }>();
    for (const log of recentLogs) {
      if (log.user && log.createdAt >= fiveMinAgo) {
        if (!activeUserMap.has(log.user.id)) {
          activeUserMap.set(log.user.id, {
            id: log.user.id,
            name: log.user.name,
            avatar: log.user.avatar,
            lastAction: log.action,
            lastAt: log.createdAt,
          });
        }
      }
    }
    const activeNow = Array.from(activeUserMap.values());

    // Nächste Deadline (Tasks mit dueDate in der Zukunft, nicht erledigt)
    const projectAccessFilter =
      user.role !== "admin"
        ? user.projectAccess.length > 0
          ? { projectId: { in: user.projectAccess } }
          : { id: "__none__" }
        : {};

    const nextDeadlineTask = await prisma.task.findFirst({
      where: {
        ...projectAccessFilter,
        dueDate: { gte: now },
        status: { notIn: ["done", "cancelled"] },
      },
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        project: { select: { name: true, color: true } },
      },
    });

    // Projekte mit Health-Score
    const projectAccessCheck =
      user.role !== "admin"
        ? { id: { in: user.projectAccess } }
        : {};

    const projects = await prisma.project.findMany({
      where: {
        archived: false,
        ...projectAccessCheck,
      },
      include: {
        tasks: {
          select: {
            status: true,
            dueDate: true,
            updatedAt: true,
            createdAt: true,
          },
        },
        sprints: {
          where: { status: "active" },
          take: 1,
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const projectsWithScore = projects.map((p) => {
      const score = calculateHealthScore({
        tasks: p.tasks,
        hasActiveSprint: p.sprints.length > 0,
        lastActivityAt: p.logs[0]?.createdAt ?? null,
      });
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        status: p.status,
        progress: p.progress,
        taskCount: p.tasks.length,
        healthScore: score,
        lastActivityAt: p.logs[0]?.createdAt ?? null,
      };
    });

    return NextResponse.json({
      activeNow,
      recentLogs: recentLogs.slice(0, 20),
      nextDeadline: nextDeadlineTask,
      projects: projectsWithScore,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/live]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
