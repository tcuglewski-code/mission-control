import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format, subDays, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  TrendingUp,
  MessageSquare,
  Activity,
} from "lucide-react";
import { SharePasswordForm } from "@/components/share/SharePasswordForm";
import { GuestCommentForm } from "@/components/share/GuestCommentForm";
import { cookies } from "next/headers";
import { createHash } from "crypto";

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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

export default async function SharePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const sp = await searchParams;

  const share = await prisma.projectShare.findUnique({ where: { token } });

  if (!share) notFound();

  if (share.expiresAt && share.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-zinc-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-zinc-800 mb-2">Link abgelaufen</h1>
          <p className="text-sm text-zinc-500">
            Dieser Status-Link ist nicht mehr gültig. Bitte kontaktieren Sie das Team für einen neuen Link.
          </p>
        </div>
      </div>
    );
  }

  // Passwortschutz
  if (share.passwordHash) {
    const cookieStore = await cookies();
    const cookieKey = `share_auth_${share.id}`;
    const authCookie = cookieStore.get(cookieKey);
    const submittedPw = sp?.pw as string | undefined;

    let isAuthenticated = false;
    if (authCookie?.value === share.passwordHash) {
      isAuthenticated = true;
    } else if (submittedPw) {
      const hash = createHash("sha256").update(submittedPw).digest("hex");
      if (hash === share.passwordHash) {
        isAuthenticated = true;
        // Cookie setzen passiert client-side nach API-Call
      }
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-zinc-100 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 p-10 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                <span className="text-white text-lg">🌲</span>
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-800">Koch Aufforstung GmbH</div>
                <div className="text-xs text-zinc-500">Geschützter Projektstatus</div>
              </div>
            </div>
            <SharePasswordForm token={token} shareId={share.id} />
          </div>
        </div>
      );
    }
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
  const progressPercent = project.progress ?? 0;

  // Fortschrittsfarbe bestimmen
  const progressColor =
    progressPercent >= 80
      ? "#16a34a"
      : progressPercent >= 50
      ? "#2563eb"
      : progressPercent >= 25
      ? "#d97706"
      : "#dc2626";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-base">🌲</span>
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-900">Koch Aufforstung GmbH</div>
              <div className="text-xs text-zinc-500">Projektstatus-Portal</div>
            </div>
          </div>
          <div className="text-xs text-zinc-400 hidden sm:block">Stand: {reportDate}</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Projekt-Header Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {/* Farbstreifen oben */}
          <div className="h-1.5" style={{ backgroundColor: project.color ?? "#16a34a" }} />
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm"
                  style={{
                    backgroundColor: `${project.color ?? "#16a34a"}18`,
                    color: project.color ?? "#16a34a",
                    border: `1.5px solid ${project.color ?? "#16a34a"}30`,
                  }}
                >
                  {project.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-zinc-900 leading-tight">{project.name}</h1>
                  {project.description && (
                    <p className="text-sm text-zinc-500 mt-1 max-w-lg">{project.description}</p>
                  )}
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${
                  STATUS_COLOR[project.status] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
              >
                {STATUS_LABEL[project.status] ?? project.status}
              </span>
            </div>

            {/* Fortschrittsbalken */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-500 flex items-center gap-1.5 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  Gesamtfortschritt
                </span>
                <span className="text-lg font-black" style={{ color: progressColor }}>
                  {progressPercent}%
                </span>
              </div>
              <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: progressColor,
                  }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                {doneTasks} von {totalTasks} Aufgaben abgeschlossen
              </p>
            </div>
          </div>
        </div>

        {/* Statistik-Karten */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Gesamt" value={totalTasks} color="text-zinc-700" icon="📋" />
          <StatCard label="Fertig" value={doneTasks} color="text-emerald-600" icon="✅" />
          <StatCard label="Offen" value={openTasks} color="text-blue-600" icon="🔄" />
          <StatCard label="Diese Woche" value={completedThisWeek.length} color="text-violet-600" icon="📈" />
        </div>

        {/* Meilensteine */}
        {project.milestones.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-zinc-900 mb-5 flex items-center gap-2">
              <Flag className="w-4 h-4 text-violet-500" />
              Meilensteine
            </h2>
            <div className="space-y-5">
              {project.milestones.map((milestone) => (
                <div key={milestone.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {milestone.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-300 shrink-0" />
                      )}
                      <div>
                        <span className="text-sm font-semibold text-zinc-800">{milestone.title}</span>
                        {milestone.description && (
                          <p className="text-xs text-zinc-400 mt-0.5">{milestone.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          milestone.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : milestone.status === "active"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
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
                    <div className="ml-8">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${milestone.progress}%`,
                              backgroundColor: milestone.color ?? "#8b5cf6",
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color: milestone.color ?? "#8b5cf6" }}>
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
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-zinc-900 mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Letzte Aktivitäten
            </h2>
            <div className="space-y-1">
              {project.logs.map((log, i) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 py-2.5 ${i < project.logs.length - 1 ? "border-b border-zinc-100" : ""}`}
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-700">
                      <span className="font-medium">{log.entityName}</span>{" "}
                      <span className="text-zinc-400">{ACTION_LABEL[log.action] ?? log.action}</span>
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                    {format(new Date(log.createdAt), "d. MMM, HH:mm", { locale: de })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team */}
        {project.members.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-bold text-zinc-900 mb-4">Projektteam</h2>
            <div className="flex flex-wrap gap-3">
              {project.members.map((m) => {
                const initials = m.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <div
                    key={`${m.user.name}-${m.role}`}
                    className="flex items-center gap-2.5 px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-800">{m.user.name}</div>
                      <div className="text-xs text-zinc-400">{m.role}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Kunden-Kommentar-Formular */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Nachricht ans Projektteam
          </h2>
          <p className="text-sm text-zinc-500 mb-5">
            Haben Sie Fragen oder Anmerkungen zu Ihrem Projekt? Hinterlassen Sie uns eine Nachricht.
          </p>
          <GuestCommentForm token={token} />
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs">🌲</span>
            </div>
            <span className="text-xs font-semibold text-zinc-500">Koch Aufforstung GmbH</span>
          </div>
          <p className="text-xs text-zinc-400">
            Dieser Statusbericht wurde automatisch generiert.
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
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-zinc-500">{label}</div>
        <span className="text-base">{icon}</span>
      </div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
    </div>
  );
}
