import { AppShell } from "@/components/layout/AppShell";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { format, startOfWeek, endOfWeek, subDays, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import { WeeklyReportClient } from "./WeeklyReportClient";

export default async function WeeklyReportPage() {
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Mo
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });     // So
  const weekInterval = { start: weekStart, end: weekEnd };

  // Projekte laden (gefiltert nach Zugriffsrecht)
  const projects = await prisma.project.findMany({
    where: {
      archived: false,
      ...(allowedIds !== null ? { id: { in: allowedIds } } : {}),
    },
    include: {
      tasks: {
        where: {
          OR: [
            // Abgeschlossen diese Woche
            { status: "done", updatedAt: { gte: weekStart, lte: weekEnd } },
            // Blockiert
            { status: "blocked" },
            // Überfällig + nicht done
            { dueDate: { lt: now }, status: { notIn: ["done", "cancelled"] } },
          ],
        },
        include: {
          assignee: { select: { id: true, name: true } },
        },
      },
      members: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Zeiterfassung diese Woche (alle Projekte)
  const timeEntriesThisWeek = await prisma.timeEntry.findMany({
    where: {
      startTime: { gte: weekStart, lte: weekEnd },
      endTime: { not: null },
      ...(allowedIds !== null
        ? { task: { projectId: { in: allowedIds } } }
        : {}),
    },
    include: {
      task: {
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Zeit pro Person aggregieren
  const timePerUser: Record<string, { name: string; totalMinutes: number; byProject: Record<string, { name: string; color: string; minutes: number }> }> = {};
  for (const entry of timeEntriesThisWeek) {
    const uid = entry.userId ?? "unbekannt";
    const userName = uid === "unbekannt" ? "Unbekannt" : uid;
    const proj = entry.task?.project;
    const minutes = entry.duration ?? 0;

    if (!timePerUser[uid]) {
      timePerUser[uid] = { name: userName, totalMinutes: 0, byProject: {} };
    }
    timePerUser[uid].totalMinutes += minutes;

    if (proj) {
      if (!timePerUser[uid].byProject[proj.id]) {
        timePerUser[uid].byProject[proj.id] = { name: proj.name, color: proj.color, minutes: 0 };
      }
      timePerUser[uid].byProject[proj.id].minutes += minutes;
    }
  }

  // Pro Projekt: erledigte Tasks, neue Tasks, blockierte Tasks
  const projectReports = projects.map((project) => {
    const completedTasks = project.tasks.filter(
      (t) => t.status === "done" && isWithinInterval(new Date(t.updatedAt), weekInterval)
    );
    const blockedTasks = project.tasks.filter((t) => t.status === "blocked");
    const overdueTasks = project.tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "done" &&
        t.status !== "cancelled"
    );

    return {
      id: project.id,
      name: project.name,
      color: project.color,
      completedTasks: completedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee?.name ?? null,
      })),
      blockedTasks: blockedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee?.name ?? null,
        priority: t.priority,
      })),
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee?.name ?? null,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        priority: t.priority,
      })),
    };
  }).filter(
    (p) =>
      p.completedTasks.length > 0 ||
      p.blockedTasks.length > 0 ||
      p.overdueTasks.length > 0
  );

  const weekLabel = `${format(weekStart, "d. MMMM", { locale: de })} – ${format(weekEnd, "d. MMMM yyyy", { locale: de })}`;
  const generatedAt = format(now, "d. MMMM yyyy, HH:mm 'Uhr'", { locale: de });

  return (
    <AppShell title="Wöchentlicher Team-Report" subtitle={weekLabel}>
      <div className="p-6 max-w-5xl mx-auto">
        <WeeklyReportClient
          weekLabel={weekLabel}
          generatedAt={generatedAt}
          projectReports={projectReports}
          timePerUser={Object.values(timePerUser).sort((a, b) => b.totalMinutes - a.totalMinutes)}
        />
      </div>
    </AppShell>
  );
}
