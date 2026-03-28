"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BarChart2,
  TrendingUp,
  Users,
  Download,
  FileText,
  Calendar,
  RefreshCw,
  Activity,
  Clock,
  Target,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Typen ─────────────────────────────────────────────────────────────────────
interface TimelinePoint {
  date: string;
  completed: number;
  total: number;
}

interface ProjectStat {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  completedTasks: number;
  activityCount: number;
  timeHours: number;
  budgetTotal: number;
  budgetUsed: number;
  completionRate: number;
}

interface BurndownSprint {
  id: string;
  name: string;
  totalPoints: number;
  planned: { day: number; points: number }[];
  actual: { day: number; points: number }[];
}

interface UserWeek {
  week: string;
  completed: number;
}

interface UserWorkWeek {
  week: string;
  hours: number;
  capacity: number;
}

interface TeamMember {
  userId: string;
  name: string;
  weeklyCapacity: number;
  weeks: UserWeek[];
}

interface WorkloadMember {
  userId: string;
  name: string;
  weeklyCapacity: number;
  weeks: UserWorkWeek[];
}

interface HeatmapEntry {
  userId: string;
  name: string;
  projects: { projectId: string; projectName: string; count: number }[];
}

interface AnalyticsData {
  dateFrom: string;
  dateTo: string;
  completionTimeline: TimelinePoint[];
  avgDurationDays: number;
  burndownData: BurndownSprint[];
  top5ByTasks: ProjectStat[];
  top5ByActivity: ProjectStat[];
  top5ByTime: ProjectStat[];
  top5ByBudget: ProjectStat[];
  teamProductivity: TeamMember[];
  workloadHistory: WorkloadMember[];
  heatmap: HeatmapEntry[];
  embed: {
    activeProjects: number;
    tasksThisWeek: number;
    teamUtilization: number;
  };
}

type DateRange = "7" | "30" | "90" | "year" | "custom";

const RANGE_LABELS: Record<DateRange, string> = {
  "7": "Letzte 7 Tage",
  "30": "Letzte 30 Tage",
  "90": "Letzte 90 Tage",
  year: "Dieses Jahr",
  custom: "Benutzerdefiniert",
};

const SPRINT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

// ─── SVG Liniendiagramm ────────────────────────────────────────────────────────
function LineChart({
  data,
  height = 160,
}: {
  data: TimelinePoint[];
  height?: number;
}) {
  const width = 600;
  const pad = { top: 16, right: 16, bottom: 32, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Keine Daten im gewählten Zeitraum
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const xScale = (i: number) => pad.left + (i / (data.length - 1 || 1)) * innerW;
  const yScale = (v: number) => pad.top + innerH - (v / maxTotal) * innerH;

  const completedPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.completed)}`)
    .join(" ");
  const totalPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.total)}`)
    .join(" ");

  const completedFill =
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(d.completed)}`).join(" ") +
    ` L ${xScale(data.length - 1)} ${pad.top + innerH} L ${pad.left} ${pad.top + innerH} Z`;

  // Achsenbeschriftungen (jede 5. Marke)
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data
    .map((d, i) => ({ label: d.date.slice(5), i }))
    .filter((_, i) => i % step === 0 || i === data.length - 1);

  const yTicks = [0, Math.round(maxTotal / 2), maxTotal];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
    >
      {/* Grid */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            x2={pad.left + innerW}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={1}
          />
          <text
            x={pad.left - 6}
            y={yScale(v) + 4}
            textAnchor="end"
            fontSize={10}
            className="fill-gray-400"
          >
            {v}
          </text>
        </g>
      ))}

      {/* Completed Fill */}
      <path d={completedFill} fill="#10b981" fillOpacity={0.12} />

      {/* Gesamt-Linie */}
      <path
        d={totalPath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="4 2"
      />

      {/* Erledigt-Linie */}
      <path d={completedPath} fill="none" stroke="#10b981" strokeWidth={2.5} />

      {/* X-Achsenbeschriftungen */}
      {xLabels.map(({ label, i }) => (
        <text
          key={i}
          x={xScale(i)}
          y={pad.top + innerH + 16}
          textAnchor="middle"
          fontSize={9}
          className="fill-gray-400"
        >
          {label}
        </text>
      ))}

      {/* Legende */}
      <circle cx={pad.left} cy={pad.top - 6} r={4} fill="#10b981" />
      <text x={pad.left + 8} y={pad.top - 3} fontSize={9} className="fill-gray-500">
        Erledigt
      </text>
      <line
        x1={pad.left + 60}
        x2={pad.left + 76}
        y1={pad.top - 6}
        y2={pad.top - 6}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="4 2"
      />
      <text x={pad.left + 80} y={pad.top - 3} fontSize={9} className="fill-gray-500">
        Gesamt
      </text>
    </svg>
  );
}

// ─── SVG Burndown-Chart ───────────────────────────────────────────────────────
function BurndownChart({ sprints }: { sprints: BurndownSprint[] }) {
  const width = 600;
  const height = 180;
  const pad = { top: 24, right: 24, bottom: 36, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (!sprints || sprints.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Keine Sprint-Daten verfügbar
      </div>
    );
  }

  const maxDays = Math.max(...sprints.map((s) => s.planned.length - 1), 1);
  const maxPoints = Math.max(...sprints.map((s) => s.totalPoints), 1);

  const xScale = (d: number) => pad.left + (d / maxDays) * innerW;
  const yScale = (v: number) => pad.top + innerH - (v / maxPoints) * innerH;

  const yTicks = [0, Math.round(maxPoints / 2), maxPoints];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Grid */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            x2={pad.left + innerW}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={1}
          />
          <text x={pad.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} className="fill-gray-400">
            {v}
          </text>
        </g>
      ))}

      {sprints.map((sprint, si) => {
        const color = SPRINT_COLORS[si % SPRINT_COLORS.length];
        const actualPath = sprint.actual
          .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.day)} ${yScale(p.points)}`)
          .join(" ");
        const plannedPath = sprint.planned
          .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.day)} ${yScale(p.points)}`)
          .join(" ");
        return (
          <g key={sprint.id}>
            <path d={plannedPath} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="5 2" opacity={0.5} />
            <path d={actualPath} fill="none" stroke={color} strokeWidth={2.5} />
          </g>
        );
      })}

      {/* X-Achse */}
      <text x={pad.left} y={pad.top + innerH + 16} textAnchor="middle" fontSize={9} className="fill-gray-400">0</text>
      <text x={pad.left + innerW / 2} y={pad.top + innerH + 16} textAnchor="middle" fontSize={9} className="fill-gray-400">
        Tag {Math.round(maxDays / 2)}
      </text>
      <text x={pad.left + innerW} y={pad.top + innerH + 16} textAnchor="middle" fontSize={9} className="fill-gray-400">
        Tag {maxDays}
      </text>

      {/* Legende */}
      {sprints.slice(0, 3).map((sprint, si) => {
        const color = SPRINT_COLORS[si % SPRINT_COLORS.length];
        const legendX = pad.left + si * 130;
        return (
          <g key={sprint.id}>
            <line x1={legendX} x2={legendX + 14} y1={8} y2={8} stroke={color} strokeWidth={2.5} />
            <text x={legendX + 18} y={11} fontSize={8} className="fill-gray-500">
              {sprint.name.length > 12 ? sprint.name.slice(0, 12) + "…" : sprint.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Heatmap-Komponente ───────────────────────────────────────────────────────
function HeatmapChart({ heatmap }: { heatmap: HeatmapEntry[] }) {
  if (!heatmap || heatmap.length === 0) {
    return (
      <div className="text-gray-400 text-sm text-center py-8">Keine Daten verfügbar</div>
    );
  }

  // Alle Projekte mit Aktivität ermitteln
  const allProjects = Array.from(
    new Set(heatmap.flatMap((u) => u.projects.map((p) => p.projectName)))
  ).slice(0, 8);

  const maxCount = Math.max(
    ...heatmap.flatMap((u) => u.projects.map((p) => p.count)),
    1
  );

  const getCellColor = (count: number) => {
    const intensity = count / maxCount;
    if (intensity === 0) return "bg-gray-100 dark:bg-gray-800";
    if (intensity < 0.25) return "bg-emerald-100 dark:bg-emerald-900/30";
    if (intensity < 0.5) return "bg-emerald-300 dark:bg-emerald-700/50";
    if (intensity < 0.75) return "bg-emerald-500 dark:bg-emerald-500/70";
    return "bg-emerald-600 dark:bg-emerald-400";
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-1 pr-3 font-medium text-gray-500 dark:text-gray-400 min-w-[100px]">
              Mitarbeiter
            </th>
            {allProjects.map((proj) => (
              <th
                key={proj}
                className="text-center py-1 px-1 font-medium text-gray-500 dark:text-gray-400 max-w-[80px]"
              >
                <div className="truncate max-w-[70px]" title={proj}>
                  {proj.length > 10 ? proj.slice(0, 10) + "…" : proj}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heatmap.map((user) => (
            <tr key={user.userId}>
              <td className="py-1 pr-3 font-medium text-gray-700 dark:text-gray-300">
                {user.name}
              </td>
              {allProjects.map((projName) => {
                const entry = user.projects.find((p) => p.projectName === projName);
                const count = entry?.count ?? 0;
                return (
                  <td key={projName} className="py-1 px-1 text-center">
                    <div
                      className={cn(
                        "mx-auto w-8 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors",
                        getCellColor(count),
                        count > 0 ? "text-emerald-900 dark:text-emerald-100" : "text-gray-300 dark:text-gray-600"
                      )}
                      title={`${user.name} → ${projName}: ${count} Tasks`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legende */}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
        <span>weniger</span>
        {["bg-gray-100 dark:bg-gray-800", "bg-emerald-100 dark:bg-emerald-900/30", "bg-emerald-300 dark:bg-emerald-700/50", "bg-emerald-500 dark:bg-emerald-500/70", "bg-emerald-600 dark:bg-emerald-400"].map(
          (cls, i) => (
            <div key={i} className={cn("w-4 h-4 rounded", cls)} />
          )
        )}
        <span>mehr</span>
      </div>
    </div>
  );
}

// ─── Top-5-Tabelle ────────────────────────────────────────────────────────────
function Top5Table({
  projects,
  valueKey,
  valueLabel,
  formatValue,
}: {
  projects: ProjectStat[];
  valueKey: keyof ProjectStat;
  valueLabel: string;
  formatValue: (v: number) => string;
}) {
  if (!projects || projects.length === 0) {
    return <div className="text-gray-400 text-sm py-4 text-center">Keine Daten</div>;
  }
  const max = Math.max(...projects.map((p) => Number(p[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {projects.map((p) => {
        const val = Number(p[valueKey]) || 0;
        const pct = Math.round((val / max) * 100);
        return (
          <div key={p.id} className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: p.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {p.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                  {formatValue(val)}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: p.color }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Produktivitätstrend-Chart ─────────────────────────────────────────────────
function ProductivityChart({ members }: { members: TeamMember[] }) {
  const width = 600;
  const height = 200;
  const pad = { top: 24, right: 16, bottom: 36, left: 40 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allWeeks = members[0]?.weeks?.map((w) => w.week) ?? [];
  const maxCompleted = Math.max(
    ...members.flatMap((m) => m.weeks.map((w) => w.completed)),
    1
  );

  if (allWeeks.length === 0) {
    return <div className="text-gray-400 text-sm py-8 text-center">Keine Daten verfügbar</div>;
  }

  const xScale = (i: number) =>
    pad.left + (i / (allWeeks.length - 1 || 1)) * innerW;
  const yScale = (v: number) =>
    pad.top + innerH - (v / maxCompleted) * innerH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {[0, Math.round(maxCompleted / 2), maxCompleted].map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            x2={pad.left + innerW}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth={1}
          />
          <text x={pad.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} className="fill-gray-400">
            {v}
          </text>
        </g>
      ))}

      {members.map((member, mi) => {
        const color = SPRINT_COLORS[mi % SPRINT_COLORS.length];
        const path = member.weeks
          .map((w, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(w.completed)}`)
          .join(" ");
        return (
          <g key={member.userId}>
            <path d={path} fill="none" stroke={color} strokeWidth={2} />
            {member.weeks.map((w, i) =>
              w.completed > 0 ? (
                <circle key={i} cx={xScale(i)} cy={yScale(w.completed)} r={3} fill={color} />
              ) : null
            )}
          </g>
        );
      })}

      {allWeeks.filter((_, i) => i % Math.max(1, Math.floor(allWeeks.length / 6)) === 0 || i === allWeeks.length - 1).map((week, i) => {
        const idx = allWeeks.indexOf(week);
        return (
          <text key={i} x={xScale(idx)} y={pad.top + innerH + 14} textAnchor="middle" fontSize={9} className="fill-gray-400">
            {week}
          </text>
        );
      })}

      {/* Legende */}
      {members.slice(0, 4).map((m, mi) => {
        const color = SPRINT_COLORS[mi % SPRINT_COLORS.length];
        return (
          <g key={m.userId}>
            <line x1={pad.left + mi * 100} x2={pad.left + mi * 100 + 12} y1={10} y2={10} stroke={color} strokeWidth={2} />
            <text x={pad.left + mi * 100 + 16} y={13} fontSize={8} className="fill-gray-500">
              {m.name.length > 10 ? m.name.slice(0, 10) + "…" : m.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(data: AnalyticsData) {
  const lines: string[] = [];
  lines.push("MISSION CONTROL — ANALYTICS EXPORT");
  lines.push(`Zeitraum: ${data.dateFrom.slice(0, 10)} bis ${data.dateTo.slice(0, 10)}`);
  lines.push("");

  lines.push("=== PROJEKT-STATISTIKEN ===");
  lines.push("Projekt,Tasks gesamt,Erledigt,Abschlussrate %,Stunden,Budget-Verbrauch €");
  for (const p of data.top5ByTasks) {
    lines.push(`"${p.name}",${p.taskCount},${p.completedTasks},${p.completionRate},${p.timeHours},${p.budgetUsed}`);
  }
  lines.push("");

  lines.push("=== TEAM-PRODUKTIVITÄT ===");
  const weekHeaders = data.teamProductivity[0]?.weeks?.map((w) => w.week).join(",") ?? "";
  lines.push(`Mitarbeiter,${weekHeaders}`);
  for (const m of data.teamProductivity) {
    lines.push(`"${m.name}",${m.weeks.map((w) => w.completed).join(",")}`);
  }
  lines.push("");

  lines.push("=== ABSCHLUSSRATE ÜBER ZEIT ===");
  lines.push("Datum,Erledigt,Gesamt");
  for (const t of data.completionTimeline) {
    lines.push(`${t.date},${t.completed},${t.total}`);
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export (Browser-Print) ────────────────────────────────────────────────
function exportPDF() {
  window.print();
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function AnalyticsClient() {
  const [range, setRange] = useState<DateRange>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"projekt" | "team">("projekt");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/analytics?range=${range}`;
      if (range === "custom" && customFrom && customTo) {
        url += `&from=${customFrom}&to=${customTo}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fehler beim Laden der Analytics-Daten");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message ?? "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => {
    if (range !== "custom") fetchData();
  }, [range, fetchData]);

  const overallCompletion = useMemo(() => {
    if (!data) return 0;
    const total = data.completionTimeline.reduce((s, t) => s + t.total, 0);
    const done = data.completionTimeline.reduce((s, t) => s + t.completed, 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111] print:bg-white">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-6 py-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Projekt- & Team-KPIs | Mission Control
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Zeitraum-Filter */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(Object.keys(RANGE_LABELS) as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    range === r
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>

            {/* Custom Range */}
            {range === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <span className="text-gray-400 text-xs">–</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <button
                  onClick={fetchData}
                  disabled={!customFrom || !customTo}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Laden
                </button>
              </div>
            )}

            {/* Aktionen */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs transition-colors"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Aktualisieren
            </button>
            <button
              onClick={() => data && exportCSV(data)}
              disabled={!data}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={exportPDF}
              disabled={!data}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Ladestate */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Lade Analytics-Daten…</span>
            </div>
          </div>
        )}

        {/* Fehler */}
        {!loading && error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* KPI-Karten */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard
                icon={<Target className="w-5 h-5 text-blue-500" />}
                label="Abschlussrate"
                value={`${overallCompletion}%`}
                sub={`${data.completionTimeline.reduce((s, t) => s + t.completed, 0)} von ${data.completionTimeline.reduce((s, t) => s + t.total, 0)} Tasks`}
                color="blue"
              />
              <KpiCard
                icon={<Clock className="w-5 h-5 text-amber-500" />}
                label="Ø Task-Dauer"
                value={`${data.avgDurationDays} Tage`}
                sub="Erstellt → Erledigt"
                color="amber"
              />
              <KpiCard
                icon={<Activity className="w-5 h-5 text-emerald-500" />}
                label="Aktive Projekte"
                value={String(data.embed.activeProjects)}
                sub="Nicht archiviert"
                color="emerald"
              />
              <KpiCard
                icon={<Zap className="w-5 h-5 text-purple-500" />}
                label="Team-Auslastung"
                value={`${data.embed.teamUtilization}%`}
                sub="Diese Woche"
                color="purple"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit print:hidden">
              <button
                onClick={() => setActiveTab("projekt")}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors",
                  activeTab === "projekt"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Projekt-Analytics
              </button>
              <button
                onClick={() => setActiveTab("team")}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors",
                  activeTab === "team"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}
              >
                <Users className="w-4 h-4" />
                Team-Analytics
              </button>
            </div>

            {/* Projekt-Analytics */}
            <div className={cn(activeTab !== "projekt" && "hidden print:block")}>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Abschlussrate über Zeit */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Abschlussrate über Zeit
                  </h2>
                  <LineChart data={data.completionTimeline} />
                </div>

                {/* Sprint-Burndown */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Sprint-Burndown (geplant vs. tatsächlich)
                  </h2>
                  <BurndownChart sprints={data.burndownData} />
                </div>

                {/* Top-5 nach Tasks */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    Top-5 Projekte nach Tasks
                  </h2>
                  <Top5Table
                    projects={data.top5ByTasks}
                    valueKey="taskCount"
                    valueLabel="Tasks"
                    formatValue={(v) => `${v} Tasks`}
                  />
                </div>

                {/* Top-5 nach Zeiterfassung */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Top-5 Projekte nach Zeiterfassung
                  </h2>
                  <Top5Table
                    projects={data.top5ByTime}
                    valueKey="timeHours"
                    valueLabel="Stunden"
                    formatValue={(v) => `${v} Std.`}
                  />
                </div>

                {/* Top-5 nach Aktivität */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    Top-5 Projekte nach Aktivität
                  </h2>
                  <Top5Table
                    projects={data.top5ByActivity}
                    valueKey="activityCount"
                    valueLabel="Aktionen"
                    formatValue={(v) => `${v} Aktionen`}
                  />
                </div>

                {/* Top-5 nach Budget */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    Top-5 Projekte nach Budget-Verbrauch
                  </h2>
                  <Top5Table
                    projects={data.top5ByBudget}
                    valueKey="budgetUsed"
                    valueLabel="€"
                    formatValue={(v) => `${v.toLocaleString("de-DE")} €`}
                  />
                </div>
              </div>
            </div>

            {/* Team-Analytics */}
            <div className={cn(activeTab !== "team" && "hidden print:block")}>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Produktivitätstrend */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Produktivitätstrend (Tasks erledigt / Woche)
                  </h2>
                  <ProductivityChart members={data.teamProductivity} />
                </div>

                {/* Auslastungshistorie */}
                <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Auslastungshistorie (Wochenstunden)
                  </h2>
                  <WorkloadChart members={data.workloadHistory} />
                </div>

                {/* Aufgaben-Heatmap */}
                <div className="col-span-1 xl:col-span-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    Aufgaben-Verteilung: Wer macht was? (Heatmap)
                  </h2>
                  <HeatmapChart heatmap={data.heatmap} />
                </div>
              </div>
            </div>

            {/* Embed-Link Hinweis */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 print:hidden">
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Embeddable Widget
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    Mini-Dashboard für internen Einsatz:{" "}
                    <code className="bg-blue-100 dark:bg-blue-800/40 px-1 py-0.5 rounded font-mono">
                      /analytics/embed?token=DEIN_TOKEN
                    </code>
                    &nbsp;— einbindbar als{" "}
                    <code className="bg-blue-100 dark:bg-blue-800/40 px-1 py-0.5 rounded font-mono">
                      &lt;iframe&gt;
                    </code>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── KPI Karte ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", `text-${color}-600 dark:text-${color}-400`)}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

// ─── Auslastungs-Chart ─────────────────────────────────────────────────────────
function WorkloadChart({ members }: { members: WorkloadMember[] }) {
  const width = 600;
  const height = 200;
  const pad = { top: 24, right: 16, bottom: 36, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allWeeks = members[0]?.weeks?.map((w) => w.week) ?? [];
  const maxVal = Math.max(
    ...members.flatMap((m) => m.weeks.map((w) => Math.max(w.hours, w.capacity))),
    1
  );

  if (allWeeks.length === 0 || members.length === 0) {
    return <div className="text-gray-400 text-sm py-8 text-center">Keine Daten verfügbar</div>;
  }

  const xScale = (i: number) => pad.left + (i / (allWeeks.length - 1 || 1)) * innerW;
  const yScale = (v: number) => pad.top + innerH - (v / maxVal) * innerH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {[0, Math.round(maxVal / 2), maxVal].map((v) => (
        <g key={v}>
          <line x1={pad.left} x2={pad.left + innerW} y1={yScale(v)} y2={yScale(v)} stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth={1} />
          <text x={pad.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} className="fill-gray-400">{v}h</text>
        </g>
      ))}

      {members.map((member, mi) => {
        const color = SPRINT_COLORS[mi % SPRINT_COLORS.length];
        const hoursPath = member.weeks
          .map((w, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(w.hours)}`)
          .join(" ");
        const capacityPath = member.weeks
          .map((w, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(w.capacity)}`)
          .join(" ");
        return (
          <g key={member.userId}>
            <path d={capacityPath} fill="none" stroke={color} strokeWidth={1} strokeDasharray="3 2" opacity={0.4} />
            <path d={hoursPath} fill="none" stroke={color} strokeWidth={2.5} />
          </g>
        );
      })}

      {allWeeks.filter((_, i) => i % Math.max(1, Math.floor(allWeeks.length / 6)) === 0).map((week, i) => {
        const idx = allWeeks.indexOf(week);
        return (
          <text key={i} x={xScale(idx)} y={pad.top + innerH + 14} textAnchor="middle" fontSize={9} className="fill-gray-400">
            {week}
          </text>
        );
      })}

      {members.slice(0, 4).map((m, mi) => {
        const color = SPRINT_COLORS[mi % SPRINT_COLORS.length];
        return (
          <g key={m.userId}>
            <line x1={pad.left + mi * 100} x2={pad.left + mi * 100 + 12} y1={10} y2={10} stroke={color} strokeWidth={2.5} />
            <text x={pad.left + mi * 100 + 16} y={13} fontSize={8} className="fill-gray-500">
              {m.name.length > 10 ? m.name.slice(0, 10) + "…" : m.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
