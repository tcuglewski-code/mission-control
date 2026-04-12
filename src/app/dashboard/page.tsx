import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { startOfDay, endOfDay } from "date-fns";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { Suspense } from "react";
import { DashboardTourWrapper } from "@/components/dashboard/DashboardTourWrapper";

export default async function DashboardPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  // Resolve AuthUser → User by email for task assignments
  const authUser = await prisma.authUser.findUnique({ where: { id: session.id } });
  const appUser = authUser?.email
    ? await prisma.user.findUnique({ where: { email: authUser.email } })
    : null;
  const appUserId = appUser?.id ?? null;

  const allProjects = await prisma.project.findMany({
    where: allowedIds ? { id: { in: allowedIds } } : {},
  });

  const activeProjectIds = allProjects
    .filter((p) => p.status === "active")
    .map((p) => p.id);

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // Use .catch(() => fallback) pattern for resilience when tables might not exist
  const [
    openTasksCount,
    teamCount,
    activityToday,
    activityLogs,
    projects,
    budgetProjects,
    openTasks,
    myTasks,
    milestones,
    timeEntriesToday,
    teamMembers,
    workerResults,
  ] = await Promise.all([
    // Total open tasks count (nur aus aktiven/planning Projekten)
    prisma.task.count({
      where: {
        status: { not: "done" },
        project: { status: { in: ["active", "planning"] } },
        ...(allowedIds ? { projectId: { in: allowedIds } } : {}),
      },
    }).catch(() => 0),

    // Team member count
    prisma.user.count().catch(() => 0),

    // Activity today
    prisma.activityLog.count({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        ...(allowedIds ? { projectId: { in: allowedIds } } : {}),
      },
    }).catch(() => 0),

    // Recent activity logs
    prisma.activityLog.findMany({
      where: allowedIds ? { projectId: { in: allowedIds } } : {},
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }).catch(() => []),

    // Active projects for widget
    prisma.project.findMany({
      where: {
        status: { in: ["active", "planning"] },
        ...(allowedIds ? { id: { in: allowedIds } } : {}),
      },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }).catch(() => []),

    // Budget projects
    prisma.project.findMany({
      where: allowedIds ? { id: { in: allowedIds } } : {},
      select: { id: true, name: true, budget: true, budgetUsed: true, color: true },
    }).catch(() => []),

    // Open tasks (list)
    prisma.task.findMany({
      where: {
        status: { not: "done" },
        ...(allowedIds ? { projectId: { in: allowedIds } } : {}),
      },
      include: {
        project: { select: { name: true, color: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 10,
    }).catch(() => []),

    // My tasks (assigned to current user)
    appUserId
      ? prisma.task.findMany({
          where: {
            status: { not: "done" },
            assigneeId: appUserId,
            ...(allowedIds ? { projectId: { in: allowedIds } } : {}),
          },
          include: {
            project: { select: { name: true, color: true } },
          },
          orderBy: [{ dueDate: "asc" }],
          take: 10,
        }).catch(() => [])
      : Promise.resolve([]),

    // Upcoming milestones
    prisma.milestone.findMany({
      where: {
        status: { not: "completed" },
        ...(allowedIds ? { projectId: { in: allowedIds } } : {}),
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    }).catch(() => []),

    // Time entries today
    prisma.timeEntry.findMany({
      where: {
        startTime: { gte: todayStart, lte: todayEnd },
        ...(appUserId ? { userId: appUserId } : {}),
      },
      include: {
        task: {
          include: {
            project: { select: { name: true, color: true } },
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: 10,
    }).catch(() => []),

    // Team members with open task count
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        _count: {
          select: {
            tasks: {
              where: { status: { not: "done" } },
            },
          },
        },
      },
      take: 10,
    }).catch(() => []),

    // Worker results (System Health)
    prisma.workerResult.findMany({
      orderBy: { runTs: "desc" },
      take: 5,
    }).catch(() => []),
  ]);

  const totalMinutesToday = timeEntriesToday.reduce(
    (sum, e) => sum + (e.duration ?? 0),
    0
  );

  const teamMembersWithCount = teamMembers.map((m) => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    openTaskCount: m._count.tasks,
  }));

  return (
    <AppShell title="Dashboard" subtitle="System Übersicht">
      <Suspense fallback={null}>
        <DashboardTourWrapper />
      </Suspense>
      <DashboardClient
        activeProjectsCount={activeProjectIds.length}
        openTasksCount={openTasksCount}
        teamCount={teamCount}
        activityToday={activityToday}
        openTasks={openTasks as any}
        myTasks={myTasks as any}
        projects={projects as any}
        activityLogs={activityLogs as any}
        milestones={milestones as any}
        timeEntriesToday={timeEntriesToday as any}
        totalMinutesToday={totalMinutesToday}
        teamMembers={teamMembersWithCount}
        budgetProjects={budgetProjects as any}
        workerResults={workerResults as any}
      />
    </AppShell>
  );
}
