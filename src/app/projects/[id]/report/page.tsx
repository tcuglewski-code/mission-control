import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { format, subDays, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { calculateHealthScore } from "@/lib/health-score";
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

  // Zeiterfassung pro Mitarbeiter laden
  const projectTasks = project.tasks ?? [];
  const taskIds = projectTasks.map((t) => t.id);
  const timeEntries = taskIds.length > 0
    ? await prisma.timeEntry.findMany({
        where: { taskId: { in: taskIds } },
        select: { userId: true, duration: true, taskId: true },
      })
    : [];

  // 7-Tage-Daten
  const completedThisWeek = projectTasks.filter(
    (t) =>
      t.status === "done" &&
      isWithinInterval(new Date(t.updatedAt), weekInterval)
  );

  const newTasksThisWeek = projectTasks.filter((t) =>
    isWithinInterval(new Date(t.createdAt), weekInterval)
  );

  const blockades = projectTasks.filter(
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

  // Team-Aktivität aggregieren (aus logs)
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

  // Mitarbeiter-Beitrag: Zeiterfassung + abgeschlossene Tasks
  const memberContributions: Record<
    string,
    { name: string; completedTasks: number; minutesTracked: number; taskIds: string[] }
  > = {};

  // Aus Logs: Wer hat Tasks abgeschlossen?
  for (const log of project.logs) {
    if (log.action !== "completed") continue;
    const uid = log.userId ?? "system";
    const name = log.user?.name ?? "System";
    if (!memberContributions[uid]) {
      memberContributions[uid] = { name, completedTasks: 0, minutesTracked: 0, taskIds: [] };
    }
    memberContributions[uid].completedTasks += 1;
  }

  // Zeiterfassung summieren (userId kann null sein → zeigt nur tracked entries mit userId)
  for (const entry of timeEntries) {
    const uid = entry.userId ?? null;
    if (!uid) continue;
    // Name aus members lookup
    const member = project.members.find((m) => m.user.id === uid);
    const name = member?.user.name ?? uid;
    if (!memberContributions[uid]) {
      memberContributions[uid] = { name, completedTasks: 0, minutesTracked: 0, taskIds: [] };
    }
    memberContributions[uid].minutesTracked += entry.duration ?? 0;
  }

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

  // Risk Matrix: alle offenen/überfälligen Tasks mit Score
  const riskTasks = project.tasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .map((t) => {
      let overdueScore = 0;
      if (t.dueDate) {
        const daysDiff = Math.floor(
          (now.getTime() - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        overdueScore = daysDiff > 0 ? daysDiff : 0;
      }
      const priorityScore =
        t.priority === "critical" ? 4 : t.priority === "high" ? 3 : t.priority === "medium" ? 2 : 1;
      const riskScore = priorityScore * 10 + overdueScore;
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        assignee: t.assignee?.name ?? null,
        overdueScore,
        riskScore,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 15);

  // Timeline: alle Meilensteine
  const milestoneTimeline = project.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    completedAt: m.status === "completed" && m.updatedAt ? m.updatedAt.toISOString() : null,
    description: m.description ?? null,
  }));

  const reportDate = format(now, "d. MMMM yyyy", { locale: de });
  const weekStart = format(sevenDaysAgo, "d. MMM", { locale: de });
  const weekEnd = format(now, "d. MMMM yyyy", { locale: de });
  const weekRange = `${weekStart} – ${weekEnd}`;

  const memberEmails = project.members.map((m) => m.user.email).filter(Boolean).join(", ");

  // Executive Summary auto-generieren
  const totalTasks = projectTasks.length;
  const doneTasks = projectTasks.filter((t) => t.status === "done").length;
  const inProgressTasks = projectTasks.filter((t) => t.status === "in_progress").length;
  const overdueCount = projectTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && t.status !== "cancelled"
  ).length;
  const completedMilestones = project.milestones.filter((m) => m.status === "completed").length;
  const totalMilestones = project.milestones.length;

  const healthLabel =
    healthScore >= 80 ? "ausgezeichnetem" : healthScore >= 60 ? "gutem" : healthScore >= 40 ? "mittlerem" : "kritischem";
  const statusLabel =
    project.status === "active"
      ? "aktiv"
      : project.status === "completed"
      ? "abgeschlossen"
      : project.status === "on_hold"
      ? "pausiert"
      : project.status;

  const executiveSummary =
    `Das Projekt „${project.name}" befindet sich im Status ${statusLabel} und weist einen Gesamtfortschritt von ${project.progress}% auf. ` +
    `Der Projekt-Gesundheitswert liegt bei ${healthScore}/100 (${healthLabel} Zustand). ` +
    `Von insgesamt ${totalTasks} Tasks sind ${doneTasks} abgeschlossen, ${inProgressTasks} in Bearbeitung` +
    (overdueCount > 0 ? ` und ${overdueCount} überfällig` : "") +
    `. ` +
    (totalMilestones > 0
      ? `${completedMilestones} von ${totalMilestones} Meilensteinen wurden erreicht. `
      : "") +
    (completedThisWeek.length > 0
      ? `Diese Woche wurden ${completedThisWeek.length} Tasks abgeschlossen. `
      : "Diese Woche wurden keine Tasks abgeschlossen. ") +
    (blockades.length > 0
      ? `Es bestehen ${blockades.length} kritische Blockaden, die sofortige Aufmerksamkeit erfordern.`
      : "Es bestehen keine kritischen Blockaden.");

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
    executiveSummary,
    riskTasks,
    milestoneTimeline,
    memberContributions: Object.values(memberContributions).sort(
      (a, b) => b.completedTasks + b.minutesTracked - (a.completedTasks + a.minutesTracked)
    ),
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
    <AppShell title={`Report — ${project.name}`} subtitle="Projekt-Report">
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
