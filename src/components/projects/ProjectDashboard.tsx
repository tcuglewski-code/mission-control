"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, TrendingUp, Activity } from "lucide-react";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ContributorRanking, ContributorStats } from "./ContributorRanking";

// ─── Typen ────────────────────────────────────────────────────────────────────

interface SerializedTask {
  id: string;
  title: string;
  status: string;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; avatar?: string | null } | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  comments: Array<{ authorId?: string | null; authorName: string; createdAt: string }>;
  timeEntries: Array<{ userId?: string | null; createdAt: string }>;
}

interface ProjectDashboardProps {
  tasks: SerializedTask[];
  lastActivityAt: string | null;
  githubRepo?: string | null;
}

// ─── Zeitraum-Filter ──────────────────────────────────────────────────────────

type PeriodKey = "7" | "30" | "90" | "all";

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "7", label: "7 Tage" },
  { key: "30", label: "30 Tage" },
  { key: "90", label: "90 Tage" },
  { key: "all", label: "Gesamt" },
];

function getPeriodStart(key: PeriodKey): Date | null {
  if (key === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(key));
  return d;
}

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function isOverdue(task: SerializedTask): boolean {
  if (!task.dueDate) return false;
  if (task.status === "done" || task.status === "cancelled") return false;
  return new Date(task.dueDate) < new Date();
}

function avgCompletionDays(tasks: SerializedTask[]): number | null {
  const doneTasks = tasks.filter((t) => t.status === "done");
  if (doneTasks.length === 0) return null;
  let totalDays = 0;
  for (const t of doneTasks) {
    const created = new Date(t.createdAt).getTime();
    const completed = new Date(t.updatedAt).getTime();
    totalDays += (completed - created) / (1000 * 60 * 60 * 24);
  }
  return Math.round(totalDays / doneTasks.length);
}

function buildDateCounts(tasks: SerializedTask[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tasks) {
    if (t.status === "done") {
      // updatedAt als Proxy für completedAt
      const dateStr = t.updatedAt.slice(0, 10);
      counts[dateStr] = (counts[dateStr] ?? 0) + 1;
    }
  }
  return counts;
}

function buildContributors(tasks: SerializedTask[]): ContributorStats[] {
  const map: Record<
    string,
    { name: string; avatar?: string | null; tasksCompleted: number; comments: number; timeEntries: number }
  > = {};

  for (const t of tasks) {
    // Tasks erledigt
    if (t.status === "done" && t.assigneeId && t.assignee) {
      if (!map[t.assigneeId]) {
        map[t.assigneeId] = { name: t.assignee.name, avatar: t.assignee.avatar, tasksCompleted: 0, comments: 0, timeEntries: 0 };
      }
      map[t.assigneeId].tasksCompleted++;
    }

    // Kommentare
    for (const c of t.comments) {
      const key = c.authorId ?? `name:${c.authorName}`;
      if (!map[key]) {
        map[key] = { name: c.authorName, avatar: null, tasksCompleted: 0, comments: 0, timeEntries: 0 };
      }
      map[key].comments++;
    }

    // Zeiterfassungs-Einträge
    for (const te of t.timeEntries) {
      if (!te.userId) continue;
      // Versuche den User aus tasks assignees zu finden
      const assignee = tasks.find((tt) => tt.assigneeId === te.userId)?.assignee;
      const key = te.userId;
      if (!map[key]) {
        map[key] = {
          name: assignee?.name ?? `User ${key.slice(0, 6)}`,
          avatar: assignee?.avatar ?? null,
          tasksCompleted: 0,
          comments: 0,
          timeEntries: 0,
        };
      }
      map[key].timeEntries++;
    }
  }

  return Object.entries(map)
    .map(([userId, s]) => ({
      userId,
      ...s,
      totalScore: s.tasksCompleted * 5 + s.comments * 2 + s.timeEntries * 1,
    }))
    .filter((c) => c.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore);
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

export function ProjectDashboard({ tasks, lastActivityAt, githubRepo }: ProjectDashboardProps) {
  const [period, setPeriod] = useState<PeriodKey>("all");

  // Gefilterte Tasks je nach Zeitraum (basierend auf createdAt / updatedAt)
  const filteredTasks = useMemo(() => {
    const since = getPeriodStart(period);
    if (!since) return tasks;
    return tasks.filter((t) => new Date(t.updatedAt) >= since || new Date(t.createdAt) >= since);
  }, [tasks, period]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter((t) => t.status === "done").length;
    const inProgress = filteredTasks.filter(
      (t) => t.status === "in_progress" || t.status === "in_review"
    ).length;
    const overdue = filteredTasks.filter(isOverdue).length;
    const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;
    const avgDays = avgCompletionDays(filteredTasks);
    return { total, done, inProgress, overdue, pctDone, avgDays };
  }, [filteredTasks]);

  // Heatmap Daten (immer 12 Wochen, aber Intensität basierend auf Filter)
  const dateCounts = useMemo(() => buildDateCounts(filteredTasks), [filteredTasks]);

  // Contributor-Daten
  const contributors = useMemo(() => buildContributors(filteredTasks), [filteredTasks]);

  // Letzte Aktivität
  const lastActivity = lastActivityAt
    ? format(new Date(lastActivityAt), "d. MMM yyyy, HH:mm", { locale: de })
    : null;

  return (
    <div className="space-y-4">
      {/* Zeitraum-Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Dashboard
        </h2>
        <div className="flex items-center gap-1 bg-[#161616] border border-[#2a2a2a] rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-xs px-3 py-1 rounded-md transition-all ${
                period === p.key
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gesamt */}
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ListTodo className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Gesamt</span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">{kpis.total}</div>
          <div className="text-[10px] text-zinc-600 mt-1">Tasks</div>
        </div>

        {/* Erledigt */}
        <div className="bg-[#1c1c1c] border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-zinc-500">Erledigt</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">{kpis.done}</div>
          <div className="text-[10px] text-zinc-600 mt-1">{kpis.pctDone}% abgeschlossen</div>
        </div>

        {/* In Bearbeitung */}
        <div className="bg-[#1c1c1c] border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-zinc-500">In Bearbeitung</span>
          </div>
          <div className="text-2xl font-bold text-orange-400 tabular-nums">{kpis.inProgress}</div>
          <div className="text-[10px] text-zinc-600 mt-1">In Progress + Review</div>
        </div>

        {/* Überfällig */}
        <div className={`bg-[#1c1c1c] border rounded-xl p-4 ${kpis.overdue > 0 ? "border-red-500/30" : "border-[#2a2a2a]"}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${kpis.overdue > 0 ? "text-red-400" : "text-zinc-600"}`} />
            <span className="text-xs text-zinc-500">Überfällig</span>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${kpis.overdue > 0 ? "text-red-400" : "text-zinc-600"}`}>
            {kpis.overdue}
          </div>
          <div className="text-[10px] text-zinc-600 mt-1">
            {kpis.overdue === 0 ? "Alles im Zeitplan ✓" : "Tasks ohne Deadline-Einhaltung"}
          </div>
        </div>
      </div>

      {/* Fortschritt + Metadaten */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
        {/* Fortschrittsbalken */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-zinc-400">Fortschritt (Erledigt)</span>
            <span className="text-xs text-white font-semibold">{kpis.pctDone}%</span>
          </div>
          <div className="h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${kpis.pctDone}%` }}
            />
          </div>
        </div>

        {/* Metadaten */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Ø Erledigungszeit */}
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-600">Ø Erledigungszeit</div>
              <div className="text-xs text-white font-medium">
                {kpis.avgDays !== null ? `${kpis.avgDays} Tage` : "—"}
              </div>
            </div>
          </div>

          {/* Letzte Aktivität */}
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-600">Letzte Aktivität</div>
              <div className="text-xs text-white font-medium">
                {lastActivity ?? "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-white">Task-Aktivität</span>
          <span className="text-[10px] text-zinc-600">— Erledigte Tasks (letzte 12 Wochen)</span>
        </div>
        <ActivityHeatmap dateCounts={dateCounts} weeks={12} />
      </div>

      {/* Contributor-Ranking */}
      {contributors.length > 0 && (
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold text-white">Top-Mitwirkende</span>
            <span className="text-[10px] text-zinc-600">— Wer hat am meisten beigetragen?</span>
          </div>
          <ContributorRanking contributors={contributors} />
        </div>
      )}
    </div>
  );
}
