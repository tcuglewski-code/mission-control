import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ActiveProjects } from "@/components/dashboard/ActiveProjects";
import { startOfDay, endOfDay } from "date-fns";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";

export default async function DashboardPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  // Projekte gefiltert nach Zugriffsrechten
  const allProjects = await prisma.project.findMany({
    where: allowedIds ? { id: { in: allowedIds } } : {},
  });

  const activeProjectIds = allProjects
    .filter((p) => p.status === "active")
    .map((p) => p.id);

  const [
    openTasksCount,
    teamCount,
    activityToday,
    recentLogs,
    projects,
  ] = await Promise.all([
    // Tasks nur aus erlaubten Projekten
    prisma.task.count({
      where: {
        status: { not: "done" },
        ...(allowedIds ? { projectId: { in: allowedIds } } : {}),
      },
    }),
    prisma.user.count(),
    prisma.activityLog.count({
      where: {
        createdAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
        ...(allowedIds ? { projectId: { in: allowedIds } } : {}),
      },
    }),
    prisma.activityLog.findMany({
      where: allowedIds ? { projectId: { in: allowedIds } } : {},
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.project.findMany({
      where: {
        status: { in: ["active", "planning"] },
        ...(allowedIds ? { id: { in: allowedIds } } : {}),
      },
      include: {
        _count: { select: { tasks: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          take: 3,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <AppShell
      title="Dashboard"
      subtitle="System Übersicht"
    >
      <div className="p-6 space-y-6">
        <StatsRow
          activeProjects={activeProjectIds.length}
          openTasks={openTasksCount}
          teamMembers={teamCount}
          activityToday={activityToday}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <RecentActivity logs={recentLogs} />
          </div>
          <div className="lg:col-span-2">
            <ActiveProjects projects={projects} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
