import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, CheckSquare, Users, FileText, FolderArchive, Globe, Github, ExternalLink, Smartphone, Download, Flag, Target, BarChart2, Clock, Settings, Share2, Wallet } from "lucide-react";
import { SaveAsTemplateButton } from "@/components/projects/SaveAsTemplateButton";
import { ProjectActivityWidget } from "@/components/projects/ProjectActivityWidget";
import { AiProjectSummary } from "@/components/projects/AiProjectSummary";
import { getStatusBg, getStatusLabel, getInitials } from "@/lib/utils";
import { requireServerSession, getAllowedProjectIds } from "@/lib/server-auth";
import { LivingDescription } from "@/components/projects/LivingDescription";
import { BudgetCard } from "@/components/projects/BudgetCard";
import { ProjectPDFButton } from "@/components/projects/ProjectPDFButtonWrapper";
import { MilestoneList } from "@/components/milestones/MilestoneList";
import { ProjectStatusBanner } from "@/components/projects/ProjectStatusBanner";
import { HealthScoreBadge } from "@/components/projects/HealthScoreBadge";
import { calculateHealthScore } from "@/lib/health-score";
import { ProjectVisitTracker } from "@/components/projects/ProjectVisitTracker";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

const SPRINT_NAMES: Record<string, string> = {
  "sprint-0.1": "Sprint 0.1 — Datenmodell & DB-Schema",
  "sprint-0.2": "Sprint 0.2 — API Contract & Auth",
  "sprint-0.3": "Sprint 0.3 — Expo Setup",
  "sprint-1.1": "Sprint 1.1 — Login & Navigation",
  "sprint-1.2": "Sprint 1.2 — Auftragsmodul",
  "sprint-1.3": "Sprint 1.3 — Session-Onboarding",
  "sprint-1.4": "Sprint 1.4 — Tagesprotokoll",
  "sprint-1.5": "Sprint 1.5 — Signatur & Abnahme",
  "sprint-2.1": "Sprint 2.1 — Mitarbeiter-Modul",
  "sprint-2.2": "Sprint 2.2 — Dokumentencenter",
  "sprint-2.3": "Sprint 2.3 — Gruppen & Teams",
  "sprint-2.4": "Sprint 2.4 — Lager & Material",
  "sprint-2.5": "Sprint 2.5 — Statistiken",
  "sprint-3.1": "Sprint 3.1 — Offline-Modus",
  "sprint-3.2": "Sprint 3.2 — Karten & GPS",
  "sprint-3.3": "Sprint 3.3 — Push-Notifications",
  "sprint-3.4": "Sprint 3.4 — Export & Rechnung",
  "sprint-3.5": "Sprint 3.5 — Mehrsprachigkeit",
  "sprint-4.1": "Sprint 4.1 — Qualität",
  "sprint-4.2": "Sprint 4.2 — Security & DSGVO",
  "sprint-4.3": "Sprint 4.3 — Performance & App Store",
  "sprint-4.4": "Sprint 4.4 — Launch",
};

const PHASE_HEADERS: Record<string, string> = {
  "0": "⚙️ Phase 0 — Fundament",
  "1": "🌲 Phase 1 — MVP",
  "2": "👥 Phase 2 — People & Teams",
  "3": "🌐 Phase 3 — Advanced",
  "4": "🚀 Phase 4 — Launch",
};

function getSprintLabel(task: { labels?: string | null }): string | null {
  if (!task.labels) return null;
  const parts = task.labels.split(",").map((l) => l.trim());
  return parts.find((l) => l.startsWith("sprint-")) ?? null;
}

function getPhaseFromSprint(sprint: string): string {
  // sprint-0.1 → "0", sprint-1.2 → "1", etc.
  const match = sprint.match(/^sprint-(\d+)\./);
  return match ? match[1] : "0";
}

function getSprintSortKey(sprint: string): number {
  const match = sprint.match(/^sprint-(\d+)\.(\d+)$/);
  if (!match) return 999;
  return parseFloat(`${match[1]}.${match[2]}`);
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireServerSession();
  const allowedIds = getAllowedProjectIds(session);

  // Non-admins können nur ihre freigegebenen Projekte sehen
  if (allowedIds !== null && !allowedIds.includes(id)) {
    notFound();
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: { select: { tasks: true, members: true, docs: true, milestones: true } },
      members: {
        include: { user: { select: { id: true, name: true, avatar: true, role: true, email: true } } },
      },
      tasks: {
        include: { 
          assignee: { select: { id: true, name: true, avatar: true } },
          milestone: { select: { id: true, title: true, color: true } },
          comments: {
            select: { authorId: true, authorName: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
          timeEntries: {
            select: { userId: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      milestones: {
        include: {
          _count: { select: { tasks: true } },
          tasks: { select: { id: true, status: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      },
      docs: { orderBy: { updatedAt: "desc" }, take: 5 },
      logs: {
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!project) notFound();

  const tasksByStatus = {
    backlog: project.tasks.filter((t) => t.status === "backlog").length,
    in_progress: project.tasks.filter((t) => t.status === "in_progress").length,
    in_review: project.tasks.filter((t) => t.status === "in_review").length,
    done: project.tasks.filter((t) => t.status === "done").length,
  };

  const today = new Date();

  // Health Score
  const hasActiveSprint = false; // sprints not loaded here — add if needed
  const lastLog = project.logs[0];
  const healthScore = calculateHealthScore({
    tasks: project.tasks,
    hasActiveSprint,
    lastActivityAt: lastLog?.createdAt ?? null,
  });

  // Status Banner Daten
  const openTasksCount =
    project.tasks.filter(
      (t) => t.status === "todo" || t.status === "backlog" || t.status === "in_progress" || t.status === "in_review"
    ).length;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  const dueTodayCount = project.tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) >= todayStart &&
      new Date(t.dueDate) <= todayEnd &&
      t.status !== "done"
  ).length;
  const nextMilestone = project.milestones.find(
    (m) => m.status !== "completed" && m.status !== "cancelled" && m.dueDate && new Date(m.dueDate) >= today
  );

  const milestonesWithProgress = project.milestones.map((m) => {
    const totalTasks = m.tasks.length;
    const doneTasks = m.tasks.filter((t) => t.status === "done").length;
    const calculatedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    return {
      ...m,
      calculatedProgress,
      taskStats: { total: totalTasks, done: doneTasks },
    };
  });

  // Group tasks by sprint label
  const sprintGroups: Record<string, typeof project.tasks> = {};
  const noSprintTasks: typeof project.tasks = [];

  for (const task of project.tasks) {
    const sprint = getSprintLabel(task);
    if (sprint) {
      if (!sprintGroups[sprint]) sprintGroups[sprint] = [];
      sprintGroups[sprint].push(task);
    } else {
      noSprintTasks.push(task);
    }
  }

  const sortedSprints = Object.keys(sprintGroups).sort(
    (a, b) => getSprintSortKey(a) - getSprintSortKey(b)
  );

  const hasSprints = sortedSprints.length > 0;

  return (
    <AppShell title={project.name} subtitle={`Projekt · ${getStatusLabel(project.status)}`}>
      <div className="p-6 space-y-6">
        {/* Back */}
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Alle Projekte
        </Link>

        {/* Visit Tracking (Client-seitig, LocalStorage) */}
        <ProjectVisitTracker id={project.id} name={project.name} />

        {/* Archiv-Banner */}
        {project.archived && (
          <div className="flex items-center justify-between gap-4 px-5 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <FolderArchive className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-300">Dieses Projekt ist archiviert</p>
                <p className="text-xs text-amber-400/60 mt-0.5">
                  Archivierte Projekte sind schreibgeschützt. Keine neuen Tasks oder Kommentare möglich.
                  {project.archivedAt && (
                    <> Archiviert am {format(new Date(project.archivedAt), "d. MMMM yyyy", { locale: de })}.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                style={{
                  backgroundColor: `${project.color}20`,
                  color: project.color,
                  border: `1px solid ${project.color}30`,
                }}
              >
                {project.name[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-zinc-400 mt-1">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded border ${getStatusBg(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
              {nextMilestone && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border"
                  style={{
                    backgroundColor: `${nextMilestone.color}15`,
                    color: nextMilestone.color,
                    borderColor: `${nextMilestone.color}30`,
                  }}
                >
                  <Target className="w-3 h-3" />
                  {nextMilestone.title}
                  {nextMilestone.dueDate && (
                    <span className="text-zinc-400 ml-1">
                      {format(new Date(nextMilestone.dueDate), "d. MMM", { locale: de })}
                    </span>
                  )}
                </span>
              )}
              {/* Sprints verwalten */}
              <Link
                href={`/projects/${project.id}/sprints`}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                Sprints
              </Link>
              {/* Dokumente */}
              <Link
                href={`/projects/${project.id}/documents`}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                Dokumente
              </Link>
              {/* Status-Report */}
              <Link
                href={`/projects/${project.id}/report`}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-blue-500/10 border border-blue-500/20 transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Status-Report
              </Link>
              {/* Zeiterfassung */}
              <Link
                href={`/projects/${project.id}/time`}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 px-2 py-1 rounded hover:bg-purple-500/10 border border-purple-500/20 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                Zeiterfassung
              </Link>
              {/* Kostenplanung */}
              <Link
                href={`/projects/${project.id}/costs`}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                Kosten
              </Link>
              {/* HTML-Report im Browser öffnen */}
              <a
                href={`/api/projects/${project.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-[#252525] border border-[#2a2a2a] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </a>
              {/* PDF direkt herunterladen (React PDF) */}
              <ProjectPDFButton
                projectId={project.id}
                projectName={project.name}
              />
              {/* Freigaben */}
              <Link
                href={`/projects/${project.id}/sharing`}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-950/30 border border-emerald-900/30 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Freigaben
              </Link>
              {/* Projekt-Einstellungen (Team) */}
              <Link
                href={`/projects/${project.id}/settings`}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-[#252525] border border-[#2a2a2a] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Einstellungen
              </Link>
              {/* Als Vorlage speichern */}
              <SaveAsTemplateButton
                projectId={project.id}
                projectName={project.name}
              />
            </div>
          </div>

          {/* Health Score + Status Banner */}
          <div className="mb-4 flex flex-col gap-2">
            <HealthScoreBadge score={healthScore} />
            <ProjectStatusBanner
              projectId={project.id}
              openTasks={openTasksCount}
              inSprintTasks={0}
              dueTodayTasks={dueTodayCount}
              lastActivityAt={lastLog?.createdAt ?? null}
            />
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs text-zinc-400">Fortschritt</span>
              <span className="text-xs text-white font-semibold">{project.progress}%</span>
            </div>
            <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${project.progress}%`, backgroundColor: project.color }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-[#2a2a2a]">
            {[
              { label: "Backlog", value: tasksByStatus.backlog, color: "text-zinc-400" },
              { label: "In Progress", value: tasksByStatus.in_progress, color: "text-orange-400" },
              { label: "In Review", value: tasksByStatus.in_review, color: "text-blue-400" },
              { label: "Done", value: tasksByStatus.done, color: "text-emerald-400" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-zinc-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard: KPI-Karten + Heatmap + Contributor-Ranking */}
        <ProjectDashboard
          tasks={project.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            assigneeId: t.assigneeId ?? null,
            assignee: t.assignee
              ? { id: t.assignee.id, name: t.assignee.name, avatar: t.assignee.avatar ?? null }
              : null,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
            comments: (t.comments ?? []).map((c) => ({
              authorId: c.authorId ?? null,
              authorName: c.authorName,
              createdAt: c.createdAt.toISOString(),
            })),
            timeEntries: (t.timeEntries ?? []).map((te) => ({
              userId: te.userId ?? null,
              createdAt: te.createdAt.toISOString(),
            })),
          }))}
          lastActivityAt={lastLog?.createdAt?.toISOString() ?? null}
          githubRepo={project.githubRepo ?? null}
        />

        {/* Living Description */}
        <LivingDescription
          projectId={id}
          initialText={project.longDescription ?? null}
        />

        {/* Meilensteine */}
        <MilestoneList 
          projectId={id} 
          initialMilestones={milestonesWithProgress as any}
        />

        {/* Meta-Links Bar */}
        {(project.liveUrl || project.githubRepo || project.vercelUrl || project.expoProjectId || project.stack) && (
          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <Globe className="w-3 h-3 text-emerald-400" />
                  Live-URL
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-600" />
                </a>
              )}
              {project.githubRepo && (
                <a
                  href={`https://github.com/${project.githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <Github className="w-3 h-3 text-zinc-400" />
                  GitHub
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-600" />
                </a>
              )}
              {project.vercelUrl && (
                <a
                  href={project.vercelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L24 22H0L12 1z" />
                  </svg>
                  Vercel
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-600" />
                </a>
              )}
              {project.expoProjectId && (
                <a
                  href={`https://expo.dev/accounts/baerenklee/projects/${project.expoProjectId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <Smartphone className="w-3 h-3 text-blue-400" />
                  Expo
                  <ExternalLink className="w-2.5 h-2.5 text-zinc-600" />
                </a>
              )}
              {project.stack && (
                <>
                  {project.stack.split(" · ").map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-1 bg-[#161616] border border-[#2a2a2a] rounded-md text-[11px] text-zinc-500 font-mono"
                    >
                      {tech.trim()}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-white">Tasks</h2>
                <span className="text-xs text-zinc-600">({project._count.tasks})</span>
              </div>

              {hasSprints ? (
                <SprintGroupedTasks
                  sortedSprints={sortedSprints}
                  sprintGroups={sprintGroups}
                  noSprintTasks={noSprintTasks}
                />
              ) : (
                <div className="space-y-2">
                  {project.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                  {project.tasks.length === 0 && (
                    <p className="text-center text-zinc-600 text-sm py-6">Keine Tasks</p>
                  )}
                </div>
              )}
            </div>

            {/* Docs */}
            {project.docs.length > 0 && (
              <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <h2 className="text-sm font-semibold text-white">Dokumente</h2>
                </div>
                <div className="space-y-2">
                  {project.docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg">
                      <span className="text-sm text-white">{doc.title}</span>
                      <span className="text-[11px] text-zinc-600">v{doc.version}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Budget */}
            <BudgetCard
              projectId={project.id}
              budget={project.budget ?? null}
              budgetUsed={project.budgetUsed ?? 0}
            />

            {/* Members */}
            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-white">Team</h2>
              </div>
              <div className="space-y-3">
                {project.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[10px] font-bold text-zinc-300">
                      {getInitials(m.user.name)}
                    </div>
                    <div>
                      <p className="text-xs text-white">{m.user.name}</p>
                      <p className="text-[10px] text-zinc-600">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Widget */}
            <ProjectActivityWidget
              projectId={project.id}
              initialLogs={project.logs.slice(0, 5).map((log) => ({
                id: log.id,
                action: log.action,
                entityType: log.entityType,
                entityName: log.entityName,
                createdAt: log.createdAt.toISOString(),
                user: log.user ?? null,
              }))}
            />

            {/* KI-Zusammenfassung */}
            <AiProjectSummary
              projectId={project.id}
              projectName={project.name}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TaskRow({ task }: { task: any }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-lg hover:border-[#3a3a3a] transition-colors">
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${
          task.status === "done"
            ? "bg-emerald-500"
            : task.status === "in_progress"
            ? "bg-orange-500"
            : task.status === "in_review"
            ? "bg-blue-500"
            : "bg-zinc-600"
        }`}
      />
      <span className="text-sm text-white flex-1 truncate">{task.title}</span>
      {task.milestone && (
        <span
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded shrink-0"
          style={{
            backgroundColor: `${task.milestone.color}15`,
            color: task.milestone.color,
          }}
        >
          <Target className="w-2.5 h-2.5" />
          {task.milestone.title}
        </span>
      )}
      {task.assignee && (
        <span className="text-[11px] text-zinc-500">{task.assignee.name}</span>
      )}
      {task.dueDate && (
        <span className="text-[11px] text-zinc-600">
          {format(new Date(task.dueDate), "d. MMM", { locale: de })}
        </span>
      )}
    </div>
  );
}

function SprintGroupedTasks({
  sortedSprints,
  sprintGroups,
  noSprintTasks,
}: {
  sortedSprints: string[];
  sprintGroups: Record<string, any[]>;
  noSprintTasks: any[];
}) {
  let lastPhase: string | null = null;

  return (
    <div className="space-y-1">
      {sortedSprints.map((sprint) => {
        const phase = getPhaseFromSprint(sprint);
        const showPhaseHeader = phase !== lastPhase;
        lastPhase = phase;
        const sprintName = SPRINT_NAMES[sprint] ?? sprint;
        const tasks = sprintGroups[sprint];
        const doneCount = tasks.filter((t) => t.status === "done").length;

        return (
          <div key={sprint}>
            {showPhaseHeader && (
              <div className="pt-4 pb-2">
                <div className="text-xs font-bold text-zinc-300 uppercase tracking-widest px-1">
                  {PHASE_HEADERS[phase] ?? `Phase ${phase}`}
                </div>
                <div className="h-px bg-[#2a2a2a] mt-2" />
              </div>
            )}
            <div className="mb-3">
              <div className="flex items-center gap-2 py-2 px-1">
                <span className="text-xs font-semibold text-zinc-200">{sprintName}</span>
                <span className="text-[10px] text-zinc-600 ml-auto">
                  {doneCount}/{tasks.length} erledigt
                </span>
              </div>
              <div className="space-y-1.5 pl-2 border-l border-[#2a2a2a]">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {noSprintTasks.length > 0 && (
        <div>
          <div className="pt-4 pb-2">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">
              Ohne Sprint
            </div>
            <div className="h-px bg-[#2a2a2a] mt-2" />
          </div>
          <div className="space-y-1.5">
            {noSprintTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

