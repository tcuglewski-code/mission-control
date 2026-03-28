"use client";

import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Printer,
  Share2,
  Check,
  Copy,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Users,
  TrendingUp,
  ListTodo,
  CheckSquare,
  Mail,
  X,
  Settings,
} from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  status: string;
  progress: number;
  dueDate: string | null;
  color: string;
  description: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
  dueDate: string | null;
}

interface TimeEntry {
  totalMinutes: number;
  weekMinutes: number;
}

interface ReportData {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    color: string;
    createdAt: string;
  };
  team: Array<{ name: string; role: string; userRole: string }>;
  completedTasks: Task[];
  openTasks: Task[];
  milestones: Milestone[];
  timeEntries: TimeEntry | null;
  reportDate: string;
  weekRange: string;
}

interface ScheduleData {
  emails: string[];
  interval: string;
  active: boolean;
}

interface Props {
  reportData: ReportData;
  projectId: string;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  on_hold: "Pausiert",
  cancelled: "Abgebrochen",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  completed: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  on_hold: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-zinc-400",
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
};

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  planned: "Geplant",
  active: "Aktiv",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}

export function StatusReportClient({ reportData, projectId }: Props) {
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleEmails, setScheduleEmails] = useState("");
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const { project, team, completedTasks, openTasks, milestones, timeEntries, reportDate, weekRange } = reportData;

  const handlePrint = () => window.print();

  const handleShare = async () => {
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 30 }),
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen des Links");
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl).catch(() => {});
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err) {
      setShareError("Link konnte nicht erstellt werden");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleSaveSchedule = async () => {
    const emails = scheduleEmails
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    if (emails.length === 0) return;

    setScheduleSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/report-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, interval: "weekly", active: true }),
      });
      setScheduleSaved(true);
      setTimeout(() => {
        setScheduleSaved(false);
        setScheduleOpen(false);
      }, 2000);
    } catch {
      // ignore
    } finally {
      setScheduleSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Aktionsleiste (kein Druck) ── */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:text-white bg-[#252525] hover:bg-[#2e2e2e] border border-[#2a2a2a] rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          PDF drucken
        </button>

        <button
          onClick={handleShare}
          disabled={shareLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
        >
          {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Link teilen
        </button>

        <button
          onClick={() => setScheduleOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:text-white bg-[#252525] hover:bg-[#2e2e2e] border border-[#2a2a2a] rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Report-Scheduler
        </button>
      </div>

      {/* Share-URL Box */}
      {shareUrl && (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg print:hidden">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-300 flex-1 truncate">{shareUrl}</span>
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/40 rounded transition-colors"
          >
            {shareCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {shareCopied ? "Kopiert!" : "Kopieren"}
          </button>
        </div>
      )}

      {shareError && (
        <p className="text-xs text-red-400 print:hidden">{shareError}</p>
      )}

      {/* Schedule Panel */}
      {scheduleOpen && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 print:hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-zinc-400" />
              Wöchentlicher Report-Versand (jeden Montag 08:00)
            </h3>
            <button onClick={() => setScheduleOpen(false)}>
              <X className="w-4 h-4 text-zinc-500 hover:text-white" />
            </button>
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            Trage E-Mail-Adressen ein (getrennt durch Komma oder Zeilenumbruch). Der Report wird jeden Montag automatisch versendet.
          </p>
          <textarea
            value={scheduleEmails}
            onChange={(e) => setScheduleEmails(e.target.value)}
            placeholder="chef@beispiel.de, kunde@beispiel.de"
            className="w-full h-24 px-3 py-2 text-sm bg-[#121212] border border-[#2a2a2a] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSaveSchedule}
              disabled={scheduleSaving || scheduleSaved}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                scheduleSaved
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                  : "text-white bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              {scheduleSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : scheduleSaved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {scheduleSaved ? "Gespeichert!" : "Schedule speichern"}
            </button>
          </div>
        </div>
      )}

      {/* ══ DRUCKBARER BERICHT ══════════════════════════════════════════════ */}
      <div className="print-page bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden print:bg-white print:border-zinc-200 print:shadow-none print:rounded-none">
        {/* Farbbalken */}
        <div className="h-1.5 print:h-2" style={{ backgroundColor: project.color }} />

        {/* Bericht-Kopf */}
        <div className="p-8 print:p-10 border-b border-[#2a2a2a] print:border-zinc-200">
          {/* Logo + Firmenname */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                <span className="text-white text-xl">🌲</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white print:text-zinc-800">Koch Aufforstung GmbH</div>
                <div className="text-xs text-zinc-500">Mission Control</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500">Statusbericht</div>
              <div className="text-xs text-zinc-400 mt-0.5">{reportDate}</div>
            </div>
          </div>

          {/* Projektname + Status */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
                style={{
                  backgroundColor: `${project.color}25`,
                  color: project.color,
                  border: `1px solid ${project.color}35`,
                }}
              >
                {project.name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white print:text-zinc-900">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-zinc-400 print:text-zinc-500 mt-0.5">{project.description}</p>
                )}
                <p className="text-xs text-zinc-600 mt-1">Berichtszeitraum: {weekRange}</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${
                STATUS_COLOR[project.status] ?? "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
              }`}
            >
              {STATUS_LABEL[project.status] ?? project.status}
            </span>
          </div>

          {/* Fortschrittsbalken */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400 print:text-zinc-600 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Gesamtfortschritt
              </span>
              <span className="text-sm font-bold text-white print:text-zinc-800">{project.progress}%</span>
            </div>
            <div className="h-3 bg-[#2a2a2a] print:bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${project.progress}%`, backgroundColor: project.color }}
              />
            </div>
          </div>
        </div>

        {/* Stats-Reihe */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#2a2a2a] print:divide-zinc-200 border-b border-[#2a2a2a] print:border-zinc-200">
          <StatCell label="Erledigte Tasks" value={completedTasks.length} color="text-emerald-400" />
          <StatCell label="Offene Tasks" value={openTasks.length} color="text-blue-400" />
          <StatCell label="Meilensteine" value={milestones.length} color="text-violet-400" />
          <StatCell
            label="Erfasste Zeit"
            value={timeEntries ? formatMinutes(timeEntries.totalMinutes) : "—"}
            color="text-amber-400"
            isString
          />
        </div>

        {/* Inhalt */}
        <div className="p-8 print:p-10 space-y-8">
          {/* Team */}
          {team.length > 0 && (
            <Section title="Team" icon={<Users className="w-4 h-4 text-zinc-400" />}>
              <div className="flex flex-wrap gap-2">
                {team.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center gap-2 px-3 py-2 bg-[#252525] print:bg-zinc-50 border border-[#2a2a2a] print:border-zinc-200 rounded-lg"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#333] print:bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-300 print:text-zinc-700">
                      {m.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white print:text-zinc-800">{m.name}</div>
                      <div className="text-xs text-zinc-500">{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Erledigte Tasks */}
          <Section
            title={`Erledigte Tasks (${completedTasks.length})`}
            icon={<CheckSquare className="w-4 h-4 text-emerald-400" />}
          >
            {completedTasks.length === 0 ? (
              <p className="text-sm text-zinc-600">Keine Tasks abgeschlossen.</p>
            ) : (
              <div className="space-y-1">
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-1.5 border-b border-[#222] print:border-zinc-100 last:border-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-zinc-200 print:text-zinc-700 flex-1">{task.title}</span>
                    {task.assignee && (
                      <span className="text-xs text-zinc-500">{task.assignee}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Offene Tasks */}
          <Section
            title={`Offene Tasks (${openTasks.length})`}
            icon={<ListTodo className="w-4 h-4 text-blue-400" />}
          >
            {openTasks.length === 0 ? (
              <p className="text-sm text-zinc-600">Alle Tasks erledigt 🎉</p>
            ) : (
              <div className="space-y-1">
                {openTasks.slice(0, 20).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-1.5 border-b border-[#222] print:border-zinc-100 last:border-0">
                    <Circle className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="text-sm text-zinc-200 print:text-zinc-700 flex-1">{task.title}</span>
                    <span className={`text-[11px] ${PRIORITY_COLOR[task.priority] ?? "text-zinc-400"}`}>
                      {PRIORITY_LABEL[task.priority] ?? task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(task.dueDate), "d. MMM", { locale: de })}
                      </span>
                    )}
                  </div>
                ))}
                {openTasks.length > 20 && (
                  <p className="text-xs text-zinc-600 pt-1">... und {openTasks.length - 20} weitere Tasks</p>
                )}
              </div>
            )}
          </Section>

          {/* Meilensteine */}
          <Section
            title="Meilensteine"
            icon={<Flag className="w-4 h-4 text-violet-400" />}
          >
            {milestones.length === 0 ? (
              <p className="text-sm text-zinc-600">Keine Meilensteine definiert.</p>
            ) : (
              <div className="space-y-4">
                {milestones.map((milestone) => (
                  <div key={milestone.id}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {milestone.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-white print:text-zinc-800">{milestone.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
                        <span>{MILESTONE_STATUS_LABEL[milestone.status] ?? milestone.status}</span>
                        {milestone.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(milestone.dueDate), "d. MMM yyyy", { locale: de })}
                          </span>
                        )}
                      </div>
                    </div>
                    {milestone.status !== "completed" && (
                      <div className="ml-6 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#2a2a2a] print:bg-zinc-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${milestone.progress}%`,
                              backgroundColor: milestone.color ?? "#8b5cf6",
                            }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 tabular-nums">{milestone.progress}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Zeiterfassung */}
          {timeEntries && (
            <Section
              title="Zeiterfassung (Zusammenfassung)"
              icon={<Clock className="w-4 h-4 text-amber-400" />}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#252525] print:bg-zinc-50 border border-[#2a2a2a] print:border-zinc-200 rounded-lg p-4">
                  <div className="text-xs text-zinc-500 mb-1">Gesamt erfasst</div>
                  <div className="text-xl font-bold text-amber-400">{formatMinutes(timeEntries.totalMinutes)}</div>
                </div>
                <div className="bg-[#252525] print:bg-zinc-50 border border-[#2a2a2a] print:border-zinc-200 rounded-lg p-4">
                  <div className="text-xs text-zinc-500 mb-1">Diese Woche</div>
                  <div className="text-xl font-bold text-amber-400">{formatMinutes(timeEntries.weekMinutes)}</div>
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Report-Fußzeile */}
        <div className="px-8 pb-8 print:px-10 print:pb-10">
          <div className="border-t border-[#2a2a2a] print:border-zinc-200 pt-6 text-center">
            <p className="text-xs text-zinc-600">
              Koch Aufforstung GmbH · Mission Control · Statusbericht vom {reportDate}
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 15mm 15mm 15mm 15mm;
        }
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:bg-zinc-50 { background-color: #fafafa !important; }
          .print\\:border-zinc-200 { border-color: #e4e4e7 !important; }
          .print\\:border-zinc-100 { border-color: #f4f4f5 !important; }
          .print\\:text-zinc-800 { color: #27272a !important; }
          .print\\:text-zinc-700 { color: #3f3f46 !important; }
          .print\\:text-zinc-600 { color: #52525b !important; }
          .print\\:text-zinc-500 { color: #71717a !important; }
          .print\\:divide-zinc-200 > * + * { border-color: #e4e4e7 !important; }
          .print\\:p-10 { padding: 40px !important; }
          .print\\:px-10 { padding-left: 40px !important; padding-right: 40px !important; }
          .print\\:pb-10 { padding-bottom: 40px !important; }
          .print\\:h-2 { height: 8px !important; }
          .print\\:bg-zinc-200 { background-color: #e4e4e7 !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .bg-\\[\\#0a0a0a\\], .bg-\\[\\#1c1c1c\\], .bg-\\[\\#252525\\], .bg-\\[\\#161616\\], .bg-\\[\\#2a2a2a\\] {
            background-color: white !important;
          }
          .border-\\[\\#2a2a2a\\], .border-\\[\\#222\\] {
            border-color: #e4e4e7 !important;
          }
          .text-white { color: #111 !important; }
          .text-zinc-200 { color: #3f3f46 !important; }
          .text-zinc-400 { color: #71717a !important; }
          .text-zinc-500 { color: #71717a !important; }
          .text-zinc-600 { color: #52525b !important; }
        }
      `}</style>
    </div>
  );
}

function StatCell({
  label,
  value,
  color,
  isString = false,
}: {
  label: string;
  value: number | string;
  color: string;
  isString?: boolean;
}) {
  return (
    <div className="p-5 print:p-6">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`${isString ? "text-lg" : "text-2xl"} font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white print:text-zinc-800 flex items-center gap-2 mb-3">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}
