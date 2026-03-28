import { AppShell } from "@/components/layout/AppShell";
import { PomodoroClient } from "./PomodoroClient";
import { prisma } from "@/lib/prisma";
import { requireServerSession } from "@/lib/server-auth";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export default async function PomodoroPage() {
  const session = await requireServerSession();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [todaySessions, weekSessions, openTasks] = await Promise.all([
    prisma.pomodoroSession.findMany({
      where: {
        userId: session.id,
        type: "work",
        completedAt: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.pomodoroSession.findMany({
      where: {
        userId: session.id,
        type: "work",
        completedAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.task.findMany({
      where: { status: { not: "done" } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const todayCount = todaySessions.length;
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);

  return (
    <AppShell title="🍅 Pomodoro-Timer" subtitle="Fokussiert arbeiten mit dem Pomodoro-Prinzip">
      <PomodoroClient
        initialTodayCount={todayCount}
        initialWeekMinutes={weekMinutes}
        tasks={openTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          project: t.project ?? null,
        }))}
      />
    </AppShell>
  );
}
