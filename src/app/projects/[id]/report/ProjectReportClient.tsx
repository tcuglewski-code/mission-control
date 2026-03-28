"use client";

import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Printer,
  Mail,
  CheckSquare,
  Plus,
  AlertTriangle,
  Flag,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Check,
  X,
  Loader2,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { getHealthScoreBg, getHealthScoreLabel, getHealthScoreDot } from "@/lib/health-score";

interface ReportData {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    progress: number;
    color: string;
  };
  healthScore: number;
  reportDate: string;
  weekRange: string;
  completedThisWeek: Array<{
    id: string;
    title: string;
    assignee: string | null;
    updatedAt: string;
  }>;
  newTasksThisWeek: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignee: string | null;
  }>;
  blockades: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
    assignee: string | null;
  }>;
  milestonesReached: Array<{ id: string; title: string }>;
  milestonesMissed: Array<{ id: string; title: string; dueDate: string | null }>;
  teamActivity: Array<{ name: string; count: number; actions: string[] }>;
  budgetInfo: {
    total: number;
    used: number;
    remaining: number;
    percent: number;
  } | null;
  memberEmails: string;
}

interface Props {
  reportData: ReportData;
  projectId: string;
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

const ACTION_LABEL: Record<string, string> = {
  created: "erstellt",
  updated: "aktualisiert",
  deleted: "gelöscht",
  completed: "abgeschlossen",
  status_changed: "Status geändert",
  assigned: "zugewiesen",
  commented: "kommentiert",
};

export function ProjectReportClient({ reportData, projectId }: Props) {
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const {
    project,
    healthScore,
    reportDate,
    weekRange,
    completedThisWeek,
    newTasksThisWeek,
    blockades,
    milestonesReached,
    milestonesMissed,
    teamActivity,
    budgetInfo,
  } = reportData;

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = async () => {
    setEmailSending(true);
    setEmailError(null);
    try {
      // Stub: In der Produktion würde hier ein API-Aufruf zum E-Mail-Versand erfolgen
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      setEmailError("Fehler beim Senden. Bitte erneut versuchen.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleShare = async () => {
    setShareLoading(true);
    setShareError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 30 }),
      });
      if (!res.ok) throw new Error("Fehler");
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl).catch(() => {});
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch {
      setShareError("Link konnte nicht erstellt werden");
    } finally {
      setShareLoading(false);
    }
  };

  const scoreBg = getHealthScoreBg(healthScore);
  const scoreLabel = getHealthScoreLabel(healthScore);
  const scoreDot = getHealthScoreDot(healthScore);

  return (
    <div>
      {/* Report Header */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 print:bg-white print:border-zinc-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  backgroundColor: `${project.color}20`,
                  color: project.color,
                  border: `1px solid ${project.color}30`,
                }}
              >
                {project.name[0]}
              </div>
              <h1 className="text-xl font-bold text-white print:text-black">{project.name}</h1>
            </div>
            <p className="text-sm text-zinc-400 print:text-zinc-600">
              Wöchentlicher Status-Report · KW {weekRange}
            </p>
            <p className="text-xs text-zinc-600 print:text-zinc-400 mt-0.5">Erstellt am {reportDate}</p>
          </div>

          {/* Actions (hide on print) */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-white bg-[#252525] hover:bg-[#2e2e2e] border border-[#2a2a2a] rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Drucken / PDF
            </button>
            <button
              onClick={handleShare}
              disabled={shareLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg border border-blue-600 transition-colors"
            >
              {shareLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              Link teilen
            </button>
            <a
              href={`/projects/${projectId}/status-report`}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-white bg-[#252525] hover:bg-[#2e2e2e] border border-[#2a2a2a] rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Statusbericht A4
            </a>
            <button
              onClick={handleEmail}
              disabled={emailSending || emailSent}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors ${
                emailSent
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : emailError
                  ? "text-red-400 border-red-500/30 bg-red-500/10"
                  : "text-white bg-emerald-600 hover:bg-emerald-500 border-emerald-600"
              }`}
            >
              {emailSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : emailSent ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              {emailSent ? "Gesendet!" : "Report per E-Mail"}
            </button>
          </div>
        </div>

        {emailError && (
          <p className="text-xs text-red-400 mt-2 print:hidden">{emailError}</p>
        )}

        {/* Share URL */}
        {shareUrl && (
          <div className="mt-3 flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg print:hidden">
            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-xs text-blue-300 flex-1 truncate">{shareUrl}</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl).catch(() => {});
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/40 rounded transition-colors"
            >
              {shareCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {shareCopied ? "Kopiert!" : "Kopieren"}
            </button>
          </div>
        )}
        {shareError && (
          <p className="text-xs text-red-400 mt-2 print:hidden">{shareError}</p>
        )}

        {/* Health Score Banner */}
        <div className={`mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border ${scoreBg}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${scoreDot}`} />
          <span className="text-sm font-semibold">
            Projekt-Gesundheit: {scoreLabel}
          </span>
          <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreDot}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums">{healthScore}/100</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<CheckSquare className="w-4 h-4 text-emerald-400" />}
          label="Abgeschlossen"
          value={completedThisWeek.length}
          sub="diese Woche"
          color="text-emerald-400"
        />
        <SummaryCard
          icon={<Plus className="w-4 h-4 text-blue-400" />}
          label="Neue Tasks"
          value={newTasksThisWeek.length}
          sub="erstellt"
          color="text-blue-400"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          label="Blockaden"
          value={blockades.length}
          sub="überfällig"
          color="text-red-400"
        />
        <SummaryCard
          icon={<Flag className="w-4 h-4 text-yellow-400" />}
          label="Meilensteine"
          value={milestonesReached.length}
          sub="erreicht"
          color="text-yellow-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abgeschlossene Tasks */}
        <ReportSection
          title="Abgeschlossene Tasks"
          icon={<CheckSquare className="w-4 h-4 text-emerald-400" />}
          count={completedThisWeek.length}
          emptyText="Keine Tasks diese Woche abgeschlossen"
        >
          {completedThisWeek.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2 border-b border-[#222] last:border-0"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{task.title}</span>
              {task.assignee && (
                <span className="text-xs text-zinc-500">{task.assignee}</span>
              )}
            </div>
          ))}
        </ReportSection>

        {/* Neue Tasks */}
        <ReportSection
          title="Neu erstellt"
          icon={<Plus className="w-4 h-4 text-blue-400" />}
          count={newTasksThisWeek.length}
          emptyText="Keine neuen Tasks diese Woche"
        >
          {newTasksThisWeek.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2 border-b border-[#222] last:border-0"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{task.title}</span>
              {task.priority && (
                <span className={`text-[10px] ${PRIORITY_COLOR[task.priority] ?? "text-zinc-400"}`}>
                  {PRIORITY_LABEL[task.priority] ?? task.priority}
                </span>
              )}
            </div>
          ))}
        </ReportSection>

        {/* Blockaden */}
        <ReportSection
          title="Offene Blockaden"
          icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
          count={blockades.length}
          emptyText="Keine Blockaden — alles im grünen Bereich 🟢"
        >
          {blockades.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2 border-b border-[#222] last:border-0"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{task.title}</span>
              <span className={`text-[10px] font-medium ${PRIORITY_COLOR[task.priority] ?? "text-zinc-400"}`}>
                {PRIORITY_LABEL[task.priority] ?? task.priority}
              </span>
              {task.dueDate && (
                <span className="text-[10px] text-red-400">
                  fällig {format(new Date(task.dueDate), "d. MMM", { locale: de })}
                </span>
              )}
            </div>
          ))}
        </ReportSection>

        {/* Meilensteine */}
        <ReportSection
          title="Meilensteine"
          icon={<Flag className="w-4 h-4 text-yellow-400" />}
          count={milestonesReached.length + milestonesMissed.length}
          emptyText="Keine Meilenstein-Aktivität diese Woche"
        >
          {milestonesReached.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2 border-b border-[#222] last:border-0"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{m.title}</span>
              <span className="text-[10px] text-emerald-400">Erreicht</span>
            </div>
          ))}
          {milestonesMissed.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2 border-b border-[#222] last:border-0"
            >
              <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{m.title}</span>
              {m.dueDate && (
                <span className="text-[10px] text-red-400">
                  Verpasst {format(new Date(m.dueDate), "d. MMM", { locale: de })}
                </span>
              )}
            </div>
          ))}
        </ReportSection>

        {/* Team-Aktivität */}
        <ReportSection
          title="Team-Aktivität"
          icon={<Users className="w-4 h-4 text-purple-400" />}
          count={teamActivity.length}
          emptyText="Keine Team-Aktivität diese Woche"
        >
          {teamActivity.map((member) => (
            <div
              key={member.name}
              className="flex items-center gap-3 py-2 border-b border-[#222] last:border-0"
            >
              <div className="w-6 h-6 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[9px] font-bold text-zinc-300 shrink-0">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <span className="text-sm text-zinc-200 flex-1">{member.name}</span>
              <span className="text-xs text-zinc-500">
                {member.count} Aktion{member.count !== 1 ? "en" : ""}
              </span>
            </div>
          ))}
        </ReportSection>

        {/* Budget */}
        {budgetInfo && (
          <ReportSection
            title="Budget-Verbrauch"
            icon={<DollarSign className="w-4 h-4 text-amber-400" />}
            count={null}
            emptyText=""
          >
            <div className="py-2">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-zinc-400">Geplant</span>
                <span className="text-sm text-white font-semibold">
                  {budgetInfo.total.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                </span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-sm text-zinc-400">Verbraucht</span>
                <span className={`text-sm font-semibold ${
                  budgetInfo.percent > 90 ? "text-red-400" : budgetInfo.percent > 70 ? "text-yellow-400" : "text-emerald-400"
                }`}>
                  {budgetInfo.used.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                </span>
              </div>
              <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${
                    budgetInfo.percent > 90
                      ? "bg-red-500"
                      : budgetInfo.percent > 70
                      ? "bg-yellow-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(budgetInfo.percent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-500">{budgetInfo.percent}% verbraucht</span>
                <span className="text-xs text-zinc-500">
                  {budgetInfo.remaining.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} verbleibend
                </span>
              </div>
            </div>
          </ReportSection>
        )}
      </div>

      {/* Fortschritt */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Projektfortschritt</h3>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-xs text-zinc-400">Gesamtfortschritt</span>
          <span className="text-xs font-semibold text-white">{project.progress}%</span>
        </div>
        <div className="h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${project.progress}%`, backgroundColor: project.color }}
          />
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:border-zinc-200 { border-color: #e4e4e7 !important; }
          .print\\:text-black { color: black !important; }
          .print\\:text-zinc-600 { color: #52525b !important; }
          .print\\:text-zinc-400 { color: #a1a1aa !important; }
          body { background: white !important; }
          .bg-\\[\\#0a0a0a\\], .bg-\\[\\#1c1c1c\\], .bg-\\[\\#161616\\] {
            background-color: white !important;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-zinc-600 mt-0.5">{sub}</div>
    </div>
  );
}

function ReportSection({
  title,
  icon,
  count,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number | null;
  emptyText: string;
  children: React.ReactNode;
}) {
  const isEmpty = count === 0;
  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {count !== null && (
          <span className="text-xs text-zinc-600 ml-auto">{count}</span>
        )}
      </div>
      {isEmpty ? (
        <p className="text-xs text-zinc-600 text-center py-4">{emptyText}</p>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}
