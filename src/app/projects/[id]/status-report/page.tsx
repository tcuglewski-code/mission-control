import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { format, subDays, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { StatusReportClient } from "./StatusReportClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StatusReportPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  if (allowedIds !== null && !allowedIds.includes(id)) {
    notFound();
  }

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const weekInterval = { start: sevenDaysAgo, end: now };

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        include: {
          assignee: { select: { name: true } },
          timeEntries: {
            select: { duration: true, startTime: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      milestones: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      },
      members: {
        include: {
          user: { select: { name: true, role: true } },
        },
      },
    },
  });

  if (!project) notFound();

  // Task-Einteilung
  const completedTasks = project.tasks
    .filter((t) => t.status === "done")
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name ?? null,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    }));

  const openTasks = project.tasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name ?? null,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    }));

  // Zeiterfassung aggregieren
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  let totalMinutes = 0;
  let weekMinutes = 0;

  for (const task of project.tasks) {
    for (const entry of task.timeEntries) {
      const duration = entry.duration ?? 0;
      totalMinutes += duration;
      if (new Date(entry.startTime) >= weekStart) {
        weekMinutes += duration;
      }
    }
  }

  const reportDate = format(now, "d. MMMM yyyy", { locale: de });
  const weekRange = `${format(sevenDaysAgo, "d. MMM", { locale: de })} – ${format(now, "d. MMMM yyyy", { locale: de })}`;

  const reportData = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      status: project.status,
      progress: project.progress,
      color: project.color,
      createdAt: project.createdAt.toISOString(),
    },
    team: project.members.map((m) => ({
      name: m.user.name,
      role: m.role,
      userRole: m.user.role,
    })),
    completedTasks,
    openTasks,
    milestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      progress: m.progress,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      color: m.color,
      description: m.description ?? null,
    })),
    timeEntries: totalMinutes > 0 ? { totalMinutes, weekMinutes } : null,
    reportDate,
    weekRange,
  };

  return (
    <AppShell title={`Statusbericht — ${project.name}`} subtitle="Druckoptimierter Projektstatus">
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Zurück */}
        <Link
          href={`/projects/${id}`}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors print:hidden"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Zurück zum Projekt
        </Link>

        <StatusReportClient reportData={reportData} projectId={id} />
      </div>
    </AppShell>
  );
}
