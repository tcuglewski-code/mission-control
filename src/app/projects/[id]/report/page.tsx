import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { format, subDays, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { calculateHealthScore, getHealthScoreBg, getHealthScoreLabel } from "@/lib/health-score";
import { getStatusLabel, getActionLabel, getInitials } from "@/lib/utils";
import { ProjectReportClient } from "./ProjectReportClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectReportPage({ params }: PageProps) {
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
          assignee: { select: { id: true, name: true } },
          sprint: { select: { id: true, name: true, status: true } },
          milestone: { select: { id: true, title: true } },
        },
        orderBy: [{ updatedAt: "desc" }],
      },
      members: {
        include: {
          user: { select: { id: true, name: true, role: true, avatar: true, email: true } },
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
        take: 200,
      },
    },
  });

  if (!project) notFound();

  // 7-Tage-Daten
  const completedThisWeek = project.tasks.filter(
    (t) =>
      t.status === "done" &&
      isWithinInterval(new Date(t.updatedAt), weekInterval)
  );

  const newTasksThisWeek = project.tasks.filter((t) =>
    isWithinInterval(new Date(t.createdAt), weekInterval)
  );

  const blockades = project.tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== "done" &&
      t.status !== "cancelled" &&
      (t.priority === "high" || t.priority === "critical")
  );

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

  const logsThisWeek = project.logs.filter((l) =>
    isWithinInterval(new Date(l.createdAt), weekInterval)
  );

  // Team-Aktivität aggregieren
  const teamActivityMap: Record<string, { name: string; count: number; actions: string[] }> = {};
  for (const log of logsThisWeek) {
    const uid = log.userId ?? "system";
    const name = log.user?.name ?? "System";
    if (!teamActivityMap[uid]) teamActivityMap[uid] = { name, count: 0, actions: [] };
    teamActivityMap[uid].count += 1;
    if (!teamActivityMap[uid].actions.includes(log.action)) {
      teamActivityMap[uid].actions.push(log.action);
    }
  }
  const teamActivity = Object.values(teamActivityMap).sort((a, b) => b.count - a.count);

  // Health Score
  const hasActiveSprint = project.sprints.some((s) => s.status === "active");
  const lastLog = project.logs[0];
  const healthScore = calculateHealthScore({
    tasks: project.tasks,
    hasActiveSprint,
    lastActivityAt: lastLog?.createdAt ?? null,
  });

  // Budget
  const budgetInfo = project.budget
    ? {
        total: project.budget,
        used: project.budgetUsed ?? 0,
        remaining: project.budget - (project.budgetUsed ?? 0),
        percent: Math.round(((project.budgetUsed ?? 0) / project.budget) * 100),
      }
    : null;

  const reportDate = format(now, "d. MMMM yyyy", { locale: de });
  const weekStart = format(sevenDaysAgo, "d. MMM", { locale: de });
  const weekEnd = format(now, "d. MMMM yyyy", { locale: de });
  const weekRange = `${weekStart} – ${weekEnd}`;

  const memberEmails = project.members.map((m) => m.user.email).filter(Boolean).join(", ");

  const reportData = {
    project: {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      status: project.status,
      progress: project.progress,
      color: project.color,
    },
    healthScore,
    reportDate,
    weekRange,
    completedThisWeek: completedThisWeek.map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.assignee?.name ?? null,
      updatedAt: t.updatedAt.toISOString(),
    })),
    newTasksThisWeek: newTasksThisWeek.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.name ?? null,
    })),
    blockades: blockades.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      assignee: t.assignee?.name ?? null,
    })),
    milestonesReached: milestonesReached.map((m) => ({
      id: m.id,
      title: m.title,
    })),
    milestonesMissed: milestonesMissed.map((m) => ({
      id: m.id,
      title: m.title,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    })),
    teamActivity,
    budgetInfo,
    memberEmails,
  };

  return (
    <AppShell title={`Report — ${project.name}`} subtitle="Wöchentlicher Status-Report">
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Back */}
        <Link
          href={`/projects/${id}`}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Zurück zum Projekt
        </Link>

        <ProjectReportClient reportData={reportData} projectId={id} />
      </div>
    </AppShell>
  );
}
