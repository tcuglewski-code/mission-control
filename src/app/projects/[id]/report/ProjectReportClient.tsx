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
  FileText,
  Shield,
  GitCommitHorizontal,
  Clock,
  Download,
} from "lucide-react";
import { getHealthScoreBg, getHealthScoreLabel, getHealthScoreDot } from "@/lib/health-score";

interface RiskTask {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  assignee: string | null;
  overdueScore: number;
  riskScore: number;
}

interface MilestoneTimeline {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  description: string | null;
}

interface MemberContribution {
  name: string;
  completedTasks: number;
  minutesTracked: number;
  taskIds: string[];
}

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
  executiveSummary: string;
  riskTasks: RiskTask[];
  milestoneTimeline: MilestoneTimeline[];
  memberContributions: MemberContribution[];
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

const PRIORITY_BG: Record<string, string> = {
  critical: "bg-red-500/20 border-red-500/30",
  high: "bg-orange-500/20 border-orange-500/30",
  medium: "bg-yellow-500/20 border-yellow-500/30",
  low: "bg-zinc-500/20 border-zinc-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "Offen",
  backlog: "Backlog",
  in_progress: "In Arbeit",
  in_review: "In Review",
  done: "Erledigt",
  blocked: "Blockiert",
  cancelled: "Abgebrochen",
};

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  completed: "Erreicht",
  in_progress: "In Arbeit",
  not_started: "Nicht gestartet",
  cancelled: "Abgebrochen",
};

function fmtMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h}h ${m}m`;
}

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
    executiveSummary,
    riskTasks,
    milestoneTimeline,
    memberContributions,
    completedThisWeek,
    newTasksThisWeek,
    blockades,
    milestonesReached,
    milestonesMissed,
    teamActivity,
    budgetInfo,
  } = reportData;

  const handlePrint = () => window.print();

  const handleEmail = async () => {
    setEmailSending(true);
    setEmailError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } catch {
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

  const csvExportUrl = `/api/reports/export?type=tasks&format=csv&projectId=${projectId}`;

  return (
    <div>
      {/* Report Header */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-6 print:bg-white print:border-zinc-200">
        <div className="flex items-start justify-between flex-wrap gap-3">
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
              Projekt-Report · {weekRange}
            </p>
            <p className="text-xs text-zinc-600 print:text-zinc-400 mt-0.5">Erstellt am {reportDate}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-white bg-[#252525] hover:bg-[#2e2e2e] border border-[#2a2a2a] rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Drucken / PDF
            </button>
            <a
              href={csvExportUrl}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-white bg-[#252525] hover:bg-[#2e2e2e] border border-[#2a2a2a] rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Export
            </a>
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
              {emailSent ? "Gesendet!" : "Per E-Mail"}
            </button>
          </div>
        </div>

        {emailError && (
          <p className="text-xs text-red-400 mt-2 print:hidden">{emailError}</p>
        )}
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

      {/* ─── Executive Summary ─────────────────────────────────────────────── */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 print:bg-white print:border-zinc-200">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white print:text-black">Executive Summary</h3>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed print:text-zinc-700">
          {executiveSummary}
        </p>
      </div>

      {/* ─── Risk Matrix ───────────────────────────────────────────────────── */}
      {riskTasks.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 print:bg-white print:border-zinc-200">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white print:text-black">Risk-Matrix</h3>
            <span className="text-xs text-zinc-600 ml-auto">Sortiert nach Risiko-Score</span>
          </div>
          <div className="space-y-2">
            {riskTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${PRIORITY_BG[task.priority] ?? "bg-zinc-500/10 border-zinc-500/20"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium ${PRIORITY_COLOR[task.priority] ?? "text-zinc-400"}`}>
                      {PRIORITY_LABEL[task.priority] ?? task.priority}
                    </span>
                    <span className="text-[10px] text-zinc-600">·</span>
                    <span className="text-[10px] text-zinc-500">{STATUS_LABEL[task.status] ?? task.status}</span>
                    {task.dueDate && (
                      <>
                        <span className="text-[10px] text-zinc-600">·</span>
                        <span className={`text-[10px] ${task.overdueScore > 0 ? "text-red-400" : "text-zinc-500"}`}>
                          {task.overdueScore > 0
                            ? `${task.overdueScore} Tage überfällig`
                            : `Fällig ${format(new Date(task.dueDate), "d. MMM", { locale: de })}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {task.assignee && (
                    <p className="text-xs text-zinc-500">{task.assignee}</p>
                  )}
                  <p className="text-xs font-bold text-zinc-400 tabular-nums">
                    Score: {task.riskScore}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Timeline / Meilensteine ───────────────────────────────────────── */}
      {milestoneTimeline.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 print:bg-white print:border-zinc-200">
          <div className="flex items-center gap-2 mb-4">
            <GitCommitHorizontal className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white print:text-black">
              Meilenstein-Timeline
            </h3>
          </div>
          <div className="relative">
            {/* Vertikale Linie */}
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-[#2a2a2a]" />
            <div className="space-y-4 pl-8">
              {milestoneTimeline.map((m) => {
                const isCompleted = m.status === "completed";
                const isOverdue =
                  !isCompleted && m.dueDate && new Date(m.dueDate) < new Date();

                return (
                  <div key={m.id} className="relative">
                    {/* Kreis */}
                    <div
                      className={`absolute -left-[22px] w-3.5 h-3.5 rounded-full border-2 ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500"
                          : isOverdue
                          ? "bg-red-500 border-red-500"
                          : "bg-[#1c1c1c] border-[#3a3a3a]"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${isCompleted ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-zinc-200"}`}>
                          {m.title}
                        </p>
                        {m.description && (
                          <p className="text-xs text-zinc-500 mt-0.5">{m.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-400"
                              : isOverdue
                              ? "bg-red-500/20 text-red-400"
                              : "bg-zinc-500/20 text-zinc-400"
                          }`}
                        >
                          {MILESTONE_STATUS_LABEL[m.status] ?? m.status}
                        </span>
                        {m.dueDate && (
                          <p className="text-[10px] text-zinc-600 mt-1">
                            {isCompleted && m.completedAt
                              ? `Abgeschlossen ${format(new Date(m.completedAt), "d. MMM yyyy", { locale: de })}`
                              : `Fällig ${format(new Date(m.dueDate), "d. MMM yyyy", { locale: de })}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Mitarbeiter-Beitrag ───────────────────────────────────────────── */}
      {memberContributions.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 print:bg-white print:border-zinc-200">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white print:text-black">
              Mitarbeiter-Beiträge
            </h3>
          </div>
          <div className="space-y-3">
            {memberContributions.map((member) => (
              <div
                key={member.name}
                className="flex items-center gap-3 py-2 border-b border-[#222] last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-[#252525] border border-[#3a3a3a] flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">{member.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {member.completedTasks > 0 && (
                      <span className="text-[11px] text-emerald-400">
                        ✓ {member.completedTasks} Task{member.completedTasks !== 1 ? "s" : ""} abgeschlossen
                      </span>
                    )}
                    {member.minutesTracked > 0 && (
                      <span className="text-[11px] text-blue-400">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {fmtMinutes(member.minutesTracked)} erfasst
                      </span>
                    )}
                    {member.completedTasks === 0 && member.minutesTracked === 0 && (
                      <span className="text-[11px] text-zinc-600">Keine Einträge</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          title="Meilensteine (diese Woche)"
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

      {/* CSV Export Leiste */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 print:hidden">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">CSV / Daten-Export</h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`/api/reports/export?type=tasks&format=csv&projectId=${projectId}`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-white bg-[#1c1c1c] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Tasks exportieren
          </a>
          <a
            href={`/api/reports/export?type=time&format=csv&projectId=${projectId}`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-white bg-[#1c1c1c] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Zeiterfassung exportieren
          </a>
          <a
            href={`/api/reports/export?type=invoices&format=csv&projectId=${projectId}`}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-white bg-[#1c1c1c] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Rechnungen exportieren
          </a>
          <a
            href="/reports/weekly"
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            Wöchentlicher Team-Report
          </a>
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
          .print\\:text-zinc-700 { color: #3f3f46 !important; }
          body { background: white !important; }
          .bg-\\[\\#0a0a0a\\], .bg-\\[\\#1c1c1c\\], .bg-\\[\\#161616\\], .bg-\\[\\#252525\\] {
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
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 print:bg-white print:border-zinc-200">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-sm font-semibold text-white print:text-black">{title}</h3>
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
