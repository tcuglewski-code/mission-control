import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrApiKey } from "@/lib/api-auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { calculateHealthScore } from "@/lib/health-score";
import { getISOWeek, startOfISOWeek, endOfISOWeek, format, subDays, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";

// GET /api/projects/[id]/report — Gibt Projektdaten für Status-Report als JSON zurück

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrApiKey(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, PERMISSIONS.PROJECTS_VIEW)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (user.role !== "admin" && !user.projectAccess.includes(id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            sprint: { select: { id: true, name: true, status: true } },
            milestone: { select: { id: true, title: true } },
          },
          orderBy: [{ status: "asc" }, { priority: "desc" }],
        },
        members: {
          include: {
            user: { select: { id: true, name: true, role: true, avatar: true } },
          },
        },
        sprints: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        milestones: {
          orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        },
        logs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
    }

    // Task-Statistiken gesamt
    const taskStats = {
      total: project.tasks.length,
      open: project.tasks.filter((t) => t.status === "todo" || t.status === "backlog").length,
      inProgress: project.tasks.filter((t) => t.status === "in_progress").length,
      inReview: project.tasks.filter((t) => t.status === "in_review").length,
      done: project.tasks.filter((t) => t.status === "done").length,
      blocked: project.tasks.filter((t) => t.status === "blocked").length,
    };

    // *** 7-Tage-Übersicht ***
    const weekInterval = { start: sevenDaysAgo, end: now };

    // Abgeschlossene Tasks in den letzten 7 Tagen
    const completedThisWeek = project.tasks.filter(
      (t) =>
        t.status === "done" &&
        isWithinInterval(new Date(t.updatedAt), weekInterval)
    );

    // Neue Tasks in den letzten 7 Tagen
    const newTasksThisWeek = project.tasks.filter((t) =>
      isWithinInterval(new Date(t.createdAt), weekInterval)
    );

    // Offene Blockaden: High/Critical Priority überfällig
    const blockades = project.tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "done" &&
        t.status !== "cancelled" &&
        (t.priority === "high" || t.priority === "critical")
    );

    // Meilensteine der letzten 7 Tage
    const milestonesReached = project.milestones.filter(
      (m) =>
        m.status === "completed" &&
        m.updatedAt &&
        isWithinInterval(new Date(m.updatedAt), weekInterval)
    );
    const milestonesMissed = project.milestones.filter(
      (m) =>
        m.dueDate &&
        new Date(m.dueDate) < now &&
        m.status !== "completed" &&
        m.status !== "cancelled"
    );

    // Team-Aktivität (wer hat was gemacht)
    const logsThisWeek = project.logs.filter((l) =>
      isWithinInterval(new Date(l.createdAt), weekInterval)
    );
    const teamActivity: Record<string, { name: string; count: number; actions: string[] }> = {};
    for (const log of logsThisWeek) {
      const userId = log.userId ?? "system";
      const name = log.user?.name ?? "System";
      if (!teamActivity[userId]) {
        teamActivity[userId] = { name, count: 0, actions: [] };
      }
      teamActivity[userId].count += 1;
      if (!teamActivity[userId].actions.includes(log.action)) {
        teamActivity[userId].actions.push(log.action);
      }
    }

    // Budget-Verbrauch
    const budgetInfo = project.budget
      ? {
          total: project.budget,
          used: project.budgetUsed ?? 0,
          remaining: project.budget - (project.budgetUsed ?? 0),
          percent: Math.round(((project.budgetUsed ?? 0) / project.budget) * 100),
        }
      : null;

    // Health Score
    const hasActiveSprint = project.sprints.some((s) => s.status === "active");
    const lastLog = project.logs[0];
    const healthScore = calculateHealthScore({
      tasks: project.tasks,
      hasActiveSprint,
      lastActivityAt: lastLog?.createdAt ?? null,
    });

    // Burndown-Daten
    const burndownData = project.sprints.map((sprint) => {
      const sprintTasks = project.tasks.filter((t) => t.sprintId === sprint.id);
      return {
        sprintName: sprint.name,
        total: sprintTasks.length,
        done: sprintTasks.filter((t) => t.status === "done").length,
        storyPoints: sprint.storyPoints ?? null,
        completedPoints: sprint.completedPoints ?? null,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      };
    });

    // KW + Wochenbereich
    const calendarWeek = getISOWeek(now);
    const weekStart = startOfISOWeek(now);
    const weekEnd = endOfISOWeek(now);
    const weekRange = `${format(weekStart, "d.", { locale: de })} – ${format(weekEnd, "d. MMMM yyyy", { locale: de })}`;
    const reportDate = format(now, "d. MMMM yyyy", { locale: de });

    // Aktuelle Sprint-Tasks
    const activeSprint = project.sprints.find((s) => s.status === "active");
    const sprintTasks = activeSprint
      ? project.tasks.filter((t) => t.sprintId === activeSprint.id)
      : [];

    // Tasks fällig heute
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const dueTodayTasks = project.tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) >= todayStart &&
        new Date(t.dueDate) <= todayEnd &&
        t.status !== "done"
    );

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        longDescription: project.longDescription,
        status: project.status,
        progress: project.progress,
        priority: project.priority,
        color: project.color,
        stack: project.stack,
        githubRepo: project.githubRepo,
        liveUrl: project.liveUrl,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        budget: project.budget,
        budgetUsed: project.budgetUsed,
      },
      taskStats,
      healthScore,
      hasActiveSprint,
      activeSprint: activeSprint
        ? {
            id: activeSprint.id,
            name: activeSprint.name,
            startDate: activeSprint.startDate,
            endDate: activeSprint.endDate,
          }
        : null,
      // 7-Tage-Report
      weeklyReport: {
        completedTasks: completedThisWeek.map((t) => ({
          id: t.id,
          title: t.title,
          assignee: t.assignee?.name ?? null,
          updatedAt: t.updatedAt,
        })),
        newTasks: newTasksThisWeek.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          assignee: t.assignee?.name ?? null,
          createdAt: t.createdAt,
        })),
        blockades: blockades.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          assignee: t.assignee?.name ?? null,
        })),
        milestonesReached: milestonesReached.map((m) => ({
          id: m.id,
          title: m.title,
          updatedAt: m.updatedAt,
        })),
        milestonesMissed: milestonesMissed.map((m) => ({
          id: m.id,
          title: m.title,
          dueDate: m.dueDate,
        })),
        teamActivity: Object.values(teamActivity).sort((a, b) => b.count - a.count),
        budgetInfo,
        activityCount: logsThisWeek.length,
      },
      // Status-Banner-Daten
      statusBanner: {
        openTasks: taskStats.open + taskStats.inProgress + taskStats.inReview,
        inSprintTasks: sprintTasks.length,
        dueTodayTasks: dueTodayTasks.length,
        lastActivity: lastLog?.createdAt ?? null,
      },
      tasks: project.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee?.name ?? null,
        sprint: t.sprint?.name ?? null,
        dueDate: t.dueDate,
        storyPoints: t.storyPoints,
      })),
      members: project.members.map((m) => ({
        id: m.id,
        name: m.user.name,
        role: m.role,
        userRole: m.user.role,
      })),
      burndownData,
      recentLogs: logsThisWeek.slice(0, 20).map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityName: l.entityName,
        user: l.user?.name ?? "System",
        createdAt: l.createdAt,
      })),
      calendarWeek,
      weekRange,
      reportDate,
    });
  } catch (error) {
    console.error("[GET /api/projects/[id]/report]", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
