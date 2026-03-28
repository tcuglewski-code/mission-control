import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format, subDays, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, Flag, AlertTriangle, TrendingUp } from "lucide-react";

interface PageProps {
  params: Promise<{ token: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  on_hold: "Pausiert",
  cancelled: "Abgebrochen",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-zinc-100 text-zinc-700 border-zinc-200",
  on_hold: "bg-yellow-100 text-yellow-700 border-yellow-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  planned: "Geplant",
  active: "Aktiv",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

const ACTION_LABEL: Record<string, string> = {
  created: "erstellt",
  updated: "aktualisiert",
  deleted: "gelöscht",
  completed: "abgeschlossen",
  status_changed: "Status geändert",
  assigned: "zugewiesen",
};

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;

  const share = await prisma.projectShare.findUnique({ where: { token } });

  if (!share) notFound();
  if (share.expiresAt && share.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-zinc-800 mb-2">Link abgelaufen</h1>
          <p className="text-sm text-zinc-500">Dieser Status-Link ist nicht mehr gültig. Bitte kontaktieren Sie das Team für einen neuen Link.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const weekInterval = { start: sevenDaysAgo, end: now };

  const project = await prisma.project.findUnique({
    where: { id: share.projectId },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          updatedAt: true,
          createdAt: true,
          assignee: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      milestones: {
        select: {
          id: true,
          title: true,
          status: true,
          progress: true,
          dueDate: true,
          color: true,
          description: true,
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      },
      members: {
        include: {
          user: { select: { name: true, role: true } },
        },
      },
      logs: {
        select: {
          id: true,
          action: true,
          entityType: true,
          entityName: true,
          createdAt: true,
        },
        where: {
          action: { not: "commented" },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
    },
  });

  if (!project) notFound();

  // Statistiken
  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((t) => t.status === "done").length;
  const openTasks = project.tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ).length;
  const completedThisWeek = project.tasks.filter(
    (t) =>
      t.status === "done" &&
      isWithinInterval(new Date(t.updatedAt), weekInterval)
  );

  const reportDate = format(now, "d. MMMM yyyy", { locale: de });

  return (
    <div className="min-h-screen bg-[#f4f4f5]">
      {/* Header / Branding */}
      <header className="bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Koch Aufforstung Logo / Branding */}
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">🌲</span>
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-800">Koch Aufforstung GmbH</div>
              <div className="text-xs text-zinc-500">Mission Control · Projektstatus</div>
            </div>
          </div>
          <div className="text-xs text-zinc-400">Stand: {reportDate}</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Projekt-Header */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div
            className="h-2"
            style={{ backgroundColor: project.color }}
          />
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
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
                  <h1 className="text-xl font-bold text-zinc-900">{project.name}</h1>
                  {project.description && (
                    <p className="text-sm text-zinc-500 mt-0.5">{project.description}</p>
                  )}
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${
                  STATUS_COLOR[project.status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
              >
                {STATUS_LABEL[project.status] ?? project.status}
              </span>
            </div>

            {/* Fortschrittsbalken */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Gesamtfortschritt
                </span>
                <span className="text-sm font-bold text-zinc-800">{project.progress}%</span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${project.progress}%`,
                    backgroundColor: project.color,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Gesamt Tasks"
            value={totalTasks}
            color="text-zinc-700"
            bg="bg-white"
          />
          <StatCard
            label="Abgeschlossen"
            value={doneTasks}
            color="text-emerald-600"
            bg="bg-white"
          />
          <StatCard
            label="Offen"
            value={openTasks}
            color="text-blue-600"
            bg="bg-white"
          />
          <StatCard
            label="Diese Woche ✓"
            value={completedThisWeek.length}
            color="text-violet-600"
            bg="bg-white"
          />
        </div>

        {/* Meilensteine */}
        {project.milestones.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-zinc-800 mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-violet-500" />
              Meilensteine
            </h2>
            <div className="space-y-4">
              {project.milestones.map((milestone) => (
                <div key={milestone.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {milestone.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-300 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-zinc-800">{milestone.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-zinc-400">
                        {MILESTONE_STATUS_LABEL[milestone.status] ?? milestone.status}
                      </span>
                      {milestone.dueDate && (
                        <span className="text-xs text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(milestone.dueDate), "d. MMM yyyy", { locale: de })}
                        </span>
                      )}
                    </div>
                  </div>
                  {milestone.status !== "completed" && (
                    <div className="ml-6">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${milestone.progress}%`,
                              backgroundColor: milestone.color ?? "#8b5cf6",
                            }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400 tabular-nums w-8 text-right">
                          {milestone.progress}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Letzte Aktivitäten */}
        {project.logs.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-zinc-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Letzte Aktivitäten
            </h2>
            <div className="space-y-2">
              {project.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-2 border-b border-zinc-100 last:border-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-700">
                      <span className="font-medium">{log.entityName}</span>{" "}
                      <span className="text-zinc-500">
                        {ACTION_LABEL[log.action] ?? log.action}
                      </span>
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0">
                    {format(new Date(log.createdAt), "d. MMM, HH:mm", { locale: de })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team */}
        {project.members.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-zinc-800 mb-4">Team</h2>
            <div className="flex flex-wrap gap-3">
              {project.members.map((m) => (
                <div
                  key={m.user.name}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200"
                >
                  <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
                    {m.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-800">{m.user.name}</div>
                    <div className="text-xs text-zinc-400">{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-zinc-400">
            Koch Aufforstung GmbH · Dieser Statusbericht wurde automatisch generiert.
            {share.expiresAt && (
              <> · Gültig bis {format(new Date(share.expiresAt), "d. MMMM yyyy", { locale: de })}</>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl border border-zinc-200 shadow-sm p-4`}>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
