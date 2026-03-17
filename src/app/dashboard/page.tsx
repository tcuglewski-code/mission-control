import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ActiveProjects } from "@/components/dashboard/ActiveProjects";
import { startOfDay, endOfDay } from "date-fns";

export default async function DashboardPage() {
  const [
    activeProjects,
    openTasksCount,
    teamCount,
    activityToday,
    recentLogs,
    projects,
  ] = await Promise.all([
    prisma.project.count({ where: { status: "active" } }),
    prisma.task.count({ where: { status: { not: "done" } } }),
    prisma.user.count(),
    prisma.activityLog.count({
      where: {
        createdAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
    }),
    prisma.activityLog.findMany({
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.project.findMany({
      where: { status: { in: ["active", "planning"] } },
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
      subtitle="System Overview"
    >
      <div className="p-6 space-y-6">
        <StatsRow
          activeProjects={activeProjects}
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
