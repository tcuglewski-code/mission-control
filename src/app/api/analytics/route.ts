import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";

// GET /api/analytics?range=30&from=...&to=...
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? "30";
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = now;

    if (fromParam && toParam) {
      dateFrom = new Date(fromParam);
      dateTo = new Date(toParam);
    } else {
      switch (range) {
        case "7":
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "90":
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "year":
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        default: // 30
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Access filter for non-admins
    const accessFilter =
      user.role !== "admin" ? { id: { in: user.projectAccess } } : undefined;

    // ── Projekte laden ─────────────────────────────────────────────────────
    const projects = await prisma.project.findMany({
      where: { archived: false, ...accessFilter },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            timeSpentSeconds: true,
            assigneeId: true,
          },
        },
        invoices: { select: { amount: true, status: true } },
        members: { select: { userId: true } },
      },
    });

    // ── Users ──────────────────────────────────────────────────────────────
    const users = await prisma.user.findMany({
      select: { id: true, name: true, weeklyCapacity: true },
    });

    // ── Tasks im Zeitraum ─────────────────────────────────────────────────
    const tasksInRange = await prisma.task.findMany({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        project: accessFilter ? { id: { in: user.projectAccess } } : undefined,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        assigneeId: true,
        projectId: true,
        timeSpentSeconds: true,
      },
    });

    // ── Abschlussrate über Zeit (tägliche Aggregation) ────────────────────
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / dayMs));
    const buckets = Math.min(days, 30); // max 30 Datenpunkte
    const bucketSize = days / buckets;

    const completionTimeline: { date: string; completed: number; total: number }[] = [];
    for (let i = 0; i < buckets; i++) {
      const bucketStart = new Date(dateFrom.getTime() + i * bucketSize * dayMs);
      const bucketEnd = new Date(dateFrom.getTime() + (i + 1) * bucketSize * dayMs);
      const bucketTasks = tasksInRange.filter(
        (t) => t.createdAt >= bucketStart && t.createdAt < bucketEnd
      );
      completionTimeline.push({
        date: bucketStart.toISOString().split("T")[0],
        completed: bucketTasks.filter((t) => t.status === "done").length,
        total: bucketTasks.length,
      });
    }

    // ── Durchschnittliche Task-Dauer ──────────────────────────────────────
    const completedTasks = tasksInRange.filter((t) => t.status === "done");
    const avgDurationMs =
      completedTasks.length > 0
        ? completedTasks.reduce(
            (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()),
            0
          ) / completedTasks.length
        : 0;
    const avgDurationDays = Math.round(avgDurationMs / dayMs * 10) / 10;

    // ── Top-5 Projekte ─────────────────────────────────────────────────────
    const projectStats = projects.map((p) => {
      const pTasks = p.tasks;
      const rangeTaskIds = new Set(tasksInRange.filter((t) => t.projectId === p.id).map((t) => t.id));
      const totalBudget = p.invoices.reduce((s, inv) => s + inv.amount, 0);
      const paidBudget = p.invoices
        .filter((inv) => inv.status === "PAID")
        .reduce((s, inv) => s + inv.amount, 0);
      const timeHours = pTasks.reduce((s, t) => s + t.timeSpentSeconds / 3600, 0);
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        taskCount: pTasks.length,
        completedTasks: pTasks.filter((t) => t.status === "done").length,
        activityCount: rangeTaskIds.size,
        timeHours: Math.round(timeHours * 10) / 10,
        budgetTotal: totalBudget,
        budgetUsed: p.budgetUsed ?? paidBudget,
        completionRate:
          pTasks.length > 0
            ? Math.round((pTasks.filter((t) => t.status === "done").length / pTasks.length) * 100)
            : 0,
      };
    });

    const top5ByTasks = [...projectStats].sort((a, b) => b.taskCount - a.taskCount).slice(0, 5);
    const top5ByActivity = [...projectStats].sort((a, b) => b.activityCount - a.activityCount).slice(0, 5);
    const top5ByTime = [...projectStats].sort((a, b) => b.timeHours - a.timeHours).slice(0, 5);
    const top5ByBudget = [...projectStats].sort((a, b) => b.budgetUsed - a.budgetUsed).slice(0, 5);

    // ── Sprint-Burndown (letzte 5 Sprints) ────────────────────────────────
    const recentSprints = await prisma.sprint.findMany({
      where: { startDate: { not: null }, endDate: { not: null } },
      include: {
        tasks: { select: { id: true, status: true, storyPoints: true, updatedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const burndownData = recentSprints.reverse().map((sprint) => {
      if (!sprint.startDate || !sprint.endDate) return null;
      const totalPoints = sprint.tasks.reduce((s, t) => s + (t.storyPoints ?? 1), 0);
      const sprintDays = Math.max(
        1,
        Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / dayMs)
      );

      // Geplante Linie: linear von totalPoints bis 0
      const planned: { day: number; points: number }[] = [];
      for (let d = 0; d <= sprintDays; d++) {
        planned.push({ day: d, points: Math.round(totalPoints * (1 - d / sprintDays)) });
      }

      // Tatsächliche Linie: kumulierte Erledigungen
      const actual: { day: number; points: number }[] = [];
      let remaining = totalPoints;
      for (let d = 0; d <= sprintDays; d++) {
        const dayDate = new Date(sprint.startDate.getTime() + d * dayMs);
        const doneThatDay = sprint.tasks
          .filter(
            (t) =>
              t.status === "done" &&
              t.updatedAt >= new Date(sprint.startDate!.getTime() + (d - 1) * dayMs) &&
              t.updatedAt < dayDate
          )
          .reduce((s, t) => s + (t.storyPoints ?? 1), 0);
        remaining = Math.max(0, remaining - doneThatDay);
        actual.push({ day: d, points: remaining });
      }

      return {
        id: sprint.id,
        name: sprint.name,
        totalPoints,
        planned,
        actual,
      };
    }).filter(Boolean);

    // ── Team-Analytics ────────────────────────────────────────────────────
    // Tasks pro User pro Woche im Zeitraum
    const weekMs = 7 * dayMs;
    const weeksInRange = Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / weekMs));

    const teamProductivity = users.map((u) => {
      const userTasks = tasksInRange.filter(
        (t) => t.assigneeId === u.id && t.status === "done"
      );
      const weeks: { week: string; completed: number }[] = [];
      for (let w = 0; w < Math.min(weeksInRange, 12); w++) {
        const weekStart = new Date(dateFrom.getTime() + w * weekMs);
        const weekEnd = new Date(dateFrom.getTime() + (w + 1) * weekMs);
        const count = userTasks.filter(
          (t) => t.updatedAt >= weekStart && t.updatedAt < weekEnd
        ).length;
        weeks.push({
          week: `KW ${getISOWeek(weekStart)}`,
          completed: count,
        });
      }
      return { userId: u.id, name: u.name, weeklyCapacity: u.weeklyCapacity, weeks };
    });

    // Auslastungshistorie: Stunden pro Woche
    const allTasks = await prisma.task.findMany({
      where: {
        updatedAt: { gte: dateFrom, lte: dateTo },
        project: accessFilter ? { id: { in: user.projectAccess } } : undefined,
      },
      select: { assigneeId: true, timeSpentSeconds: true, updatedAt: true },
    });

    const workloadHistory = users.map((u) => {
      const userAllTasks = allTasks.filter((t) => t.assigneeId === u.id);
      const weeks: { week: string; hours: number; capacity: number }[] = [];
      for (let w = 0; w < Math.min(weeksInRange, 12); w++) {
        const weekStart = new Date(dateFrom.getTime() + w * weekMs);
        const weekEnd = new Date(dateFrom.getTime() + (w + 1) * weekMs);
        const hours = userAllTasks
          .filter((t) => t.updatedAt >= weekStart && t.updatedAt < weekEnd)
          .reduce((s, t) => s + t.timeSpentSeconds / 3600, 0);
        weeks.push({
          week: `KW ${getISOWeek(weekStart)}`,
          hours: Math.round(hours * 10) / 10,
          capacity: u.weeklyCapacity,
        });
      }
      return { userId: u.id, name: u.name, weeklyCapacity: u.weeklyCapacity, weeks };
    });

    // Aufgaben-Verteilung (Heatmap: User × Projekt)
    const heatmap = users.map((u) => {
      const projectCounts = projects.map((p) => {
        const count = (accessFilter ? tasksInRange : allTasks).filter(
          (t) => t.assigneeId === u.id && "projectId" in t && (t as any).projectId === p.id
        ).length;
        return { projectId: p.id, projectName: p.name, count };
      });
      return { userId: u.id, name: u.name, projects: projectCounts };
    });

    // ── Embed-Summary ─────────────────────────────────────────────────────
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const weekStart = new Date(now.getTime() - 7 * dayMs);
    const tasksThisWeek = await prisma.task.count({
      where: {
        createdAt: { gte: weekStart },
        project: accessFilter ? { id: { in: user.projectAccess } } : undefined,
      },
    });
    const totalCapacity = users.reduce((s, u) => s + u.weeklyCapacity, 0);
    const usedHours = allTasks
      .filter((t) => t.updatedAt >= weekStart)
      .reduce((s, t) => s + t.timeSpentSeconds / 3600, 0);
    const teamUtilization =
      totalCapacity > 0 ? Math.round((usedHours / totalCapacity) * 100) : 0;

    return NextResponse.json({
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      completionTimeline,
      avgDurationDays,
      burndownData,
      top5ByTasks,
      top5ByActivity,
      top5ByTime,
      top5ByBudget,
      teamProductivity,
      workloadHistory,
      heatmap,
      embed: {
        activeProjects,
        tasksThisWeek,
        teamUtilization,
      },
    });
  } catch (error) {
    console.error("[GET /api/analytics]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ISO-Woche berechnen
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
