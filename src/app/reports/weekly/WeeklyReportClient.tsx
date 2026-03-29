"use client";

import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  Calendar,
  Download,
  Printer,
  Users,
  FolderKanban,
  XCircle,
} from "lucide-react";

interface ProjectReport {
  id: string;
  name: string;
  color: string;
  completedTasks: Array<{ id: string; title: string; assignee: string | null }>;
  blockedTasks: Array<{ id: string; title: string; assignee: string | null; priority: string }>;
  overdueTasks: Array<{
    id: string;
    title: string;
    assignee: string | null;
    dueDate: string | null;
    priority: string;
  }>;
}

interface TimePerUser {
  name: string;
  totalMinutes: number;
  byProject: Record<string, { name: string; color: string; minutes: number }>;
}

interface Props {
  weekLabel: string;
  generatedAt: string;
  projectReports: ProjectReport[];
  timePerUser: TimePerUser[];
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-zinc-400",
};

function fmtMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}

export function WeeklyReportClient({
  weekLabel,
  generatedAt,
  projectReports,
  timePerUser,
}: Props) {
  const totalCompleted = projectReports.reduce(
    (acc, p) => acc + p.completedTasks.length,
    0
  );
  const totalBlocked = projectReports.reduce(
    (acc, p) => acc + p.blockedTasks.length,
    0
  );
  const totalOverdue = projectReports.reduce(
    (acc, p) => acc + p.overdueTasks.length,
    0
  );
  const totalMinutes = timePerUser.reduce((acc, u) => acc + u.totalMinutes, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 print:bg-white print:border-zinc-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h1 className="text-xl font-bold text-white print:text-black">
                Wöchentlicher Team-Report
              </h1>
            </div>
            <p className="text-sm text-zinc-400 print:text-zinc-600">{weekLabel}</p>
            <p className="text-xs text-zinc-600 mt-0.5">Erstellt am {generatedAt}</p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-white bg-[#252525] hover:bg-[#2e2e2e] border border-[#2a2a2a] rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Drucken
            </button>
            <a
              href="/api/reports/export?type=tasks&format=csv"
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-600 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Tasks CSV
            </a>
            <a
              href="/api/reports/export?type=time&format=csv"
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-blue-600 hover:bg-blue-500 border border-blue-600 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Zeit CSV
            </a>
          </div>
        </div>

        {/* KPI-Karten */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <KpiCard
            icon={<CheckSquare className="w-4 h-4 text-emerald-400" />}
            label="Erledigt"
            value={totalCompleted}
            color="text-emerald-400"
          />
          <KpiCard
            icon={<XCircle className="w-4 h-4 text-red-400" />}
            label="Blockiert"
            value={totalBlocked}
            color="text-red-400"
          />
          <KpiCard
            icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
            label="Überfällig"
            value={totalOverdue}
            color="text-orange-400"
          />
          <KpiCard
            icon={<Clock className="w-4 h-4 text-blue-400" />}
            label="Erfasste Zeit"
            value={fmtMinutes(totalMinutes)}
            color="text-blue-400"
            isText
          />
        </div>
      </div>

      {/* Projekte */}
      {projectReports.length === 0 ? (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <p className="text-zinc-500 text-sm">
            Keine Aktivitäten diese Woche — alles im grünen Bereich! 🌲
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-white">Aktivitäten nach Projekt</h2>
          </div>
          {projectReports.map((project) => (
            <ProjectBlock key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Zeit pro Person */}
      {timePerUser.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 print:bg-white print:border-zinc-200">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white print:text-black">
              Verstrichene Zeit pro Person
            </h3>
          </div>
          <div className="space-y-3">
            {timePerUser.map((user) => (
              <div key={user.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[9px] font-bold text-zinc-300">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <span className="text-sm text-zinc-200">{user.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {fmtMinutes(user.totalMinutes)}
                  </span>
                </div>
                {/* Per-Projekt Balken */}
                <div className="pl-8 space-y-1">
                  {Object.values(user.byProject).map((proj) => (
                    <div key={proj.name} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: proj.color }}
                      />
                      <span className="text-xs text-zinc-500 flex-1">{proj.name}</span>
                      <span className="text-xs text-zinc-400">{fmtMinutes(proj.minutes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:border-zinc-200 { border-color: #e4e4e7 !important; }
          .print\\:text-black { color: black !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function ProjectBlock({ project }: { project: ProjectReport }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden print:bg-white print:border-zinc-200">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#222] transition-colors text-left print:hidden"
      >
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <h3 className="text-sm font-semibold text-white flex-1">{project.name}</h3>
        <div className="flex items-center gap-3">
          {project.completedTasks.length > 0 && (
            <span className="text-xs text-emerald-400">
              ✓ {project.completedTasks.length} erledigt
            </span>
          )}
          {project.blockedTasks.length > 0 && (
            <span className="text-xs text-red-400">
              ⊘ {project.blockedTasks.length} blockiert
            </span>
          )}
          {project.overdueTasks.length > 0 && (
            <span className="text-xs text-orange-400">
              ⚠ {project.overdueTasks.length} überfällig
            </span>
          )}
        </div>
      </button>
      {/* Print-only header */}
      <div className="hidden print:flex items-center gap-3 px-5 py-4">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
        <h3 className="text-sm font-bold">{project.name}</h3>
      </div>

      {expanded && (
        <div className="px-5 pb-4 space-y-4 border-t border-[#2a2a2a] pt-4">
          {/* Erledigt */}
          {project.completedTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">
                Erledigt diese Woche ({project.completedTasks.length})
              </p>
              <div className="space-y-1">
                {project.completedTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 py-1">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-sm text-zinc-200 flex-1">{t.title}</span>
                    {t.assignee && (
                      <span className="text-xs text-zinc-500">{t.assignee}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockiert */}
          {project.blockedTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
                Blockierte Tasks ({project.blockedTasks.length})
              </p>
              <div className="space-y-1">
                {project.blockedTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 py-1">
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-sm text-zinc-200 flex-1">{t.title}</span>
                    <span className={`text-[10px] ${PRIORITY_COLOR[t.priority] ?? "text-zinc-400"}`}>
                      {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </span>
                    {t.assignee && (
                      <span className="text-xs text-zinc-500">{t.assignee}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Überfällig */}
          {project.overdueTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-400 mb-2 uppercase tracking-wide">
                Überfällig ({project.overdueTasks.length})
              </p>
              <div className="space-y-1">
                {project.overdueTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 py-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="text-sm text-zinc-200 flex-1">{t.title}</span>
                    {t.dueDate && (
                      <span className="text-xs text-orange-400">
                        seit {format(new Date(t.dueDate), "d. MMM", { locale: de })}
                      </span>
                    )}
                    {t.assignee && (
                      <span className="text-xs text-zinc-500">{t.assignee}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
  isText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[11px] text-zinc-500">{label}</span>
      </div>
      <div className={`font-bold ${isText ? "text-lg" : "text-2xl"} ${color}`}>
        {value}
      </div>
    </div>
  );
}
