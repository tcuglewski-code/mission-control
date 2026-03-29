"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Download, ChevronLeft, ChevronRight, BarChart2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { de } from "date-fns/locale";

interface DoneTask {
  id: string;
  title: string;
  updatedAt: string;
  priority: string;
  project?: { name: string; color: string } | null;
  timeEntries: Array<{ duration?: number | null; startTime: string }>;
}

interface WeekData {
  weekStart: string;
  weekEnd: string;
  doneTasks: DoneTask[];
  totalMinutes: number;
  stats: { tasksDone: number; totalMinutes: number; totalHours: number };
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-zinc-500",
};

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function MeineWocheClient() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const isCurrentWeek =
    weekStart.toDateString() === startOfWeek(new Date(), { weekStartsOn: 1 }).toDateString();

  useEffect(() => {
    setLoading(true);
    const dateStr = baseDate.toISOString().split("T")[0];
    fetch(`/api/my-week?date=${dateStr}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [baseDate]);

  // CSV Export
  const exportCSV = () => {
    if (!data) return;
    const header = "Titel;Projekt;Erledigt am;Zeiterfassung (Minuten)\n";
    const rows = data.doneTasks
      .map((t) => {
        const totalMin = t.timeEntries.reduce((s, e) => s + (e.duration ?? 0), 0);
        const project = t.project?.name ?? "-";
        const date = new Date(t.updatedAt).toLocaleDateString("de-DE");
        return `"${t.title}";"${project}";"${date}";${totalMin}`;
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wochenbericht-${weekStart.toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print / PDF
  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto print:p-0">
      {/* Navigation + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBaseDate((d) => subWeeks(d, 1))}
            className="p-2 rounded-lg bg-[#1c1c1c] border border-[#2a2a2a] hover:border-[#3a3a3a] text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm text-white font-medium px-3 py-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg min-w-[220px] text-center">
            {format(weekStart, "dd. MMMM", { locale: de })} –{" "}
            {format(weekEnd, "dd. MMMM yyyy", { locale: de })}
            {isCurrentWeek && (
              <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                Diese Woche
              </span>
            )}
          </div>
          <button
            onClick={() => setBaseDate((d) => addWeeks(d, 1))}
            disabled={isCurrentWeek}
            className="p-2 rounded-lg bg-[#1c1c1c] border border-[#2a2a2a] hover:border-[#3a3a3a] text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setBaseDate(new Date())}
              className="text-xs text-zinc-500 hover:text-emerald-400 px-3 py-2 rounded-lg border border-[#2a2a2a] transition-colors"
            >
              Heute
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-[#1c1c1c] border border-[#2a2a2a] hover:border-emerald-500/50 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-2 bg-[#1c1c1c] border border-[#2a2a2a] hover:border-blue-500/50 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            PDF / Drucken
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Wochenbericht</h1>
        <p className="text-gray-600">
          {format(weekStart, "dd. MMMM", { locale: de })} –{" "}
          {format(weekEnd, "dd. MMMM yyyy", { locale: de })}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-zinc-500">
          Keine Daten verfügbar
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{data.stats.tasksDone}</div>
              <div className="text-xs text-zinc-500 mt-1">Tasks erledigt</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{data.stats.totalHours}h</div>
              <div className="text-xs text-zinc-500 mt-1">Zeiterfassung</div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">
                {data.stats.tasksDone > 0
                  ? Math.round(data.stats.totalMinutes / data.stats.tasksDone)
                  : 0}
                m
              </div>
              <div className="text-xs text-zinc-500 mt-1">Ø Zeit / Task</div>
            </div>
          </div>

          {/* Erledigte Tasks */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-white font-semibold">Erledigte Tasks</h2>
            </div>

            {data.doneTasks.length === 0 ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center text-zinc-500 text-sm">
                Keine erledigten Tasks diese Woche.
              </div>
            ) : (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                {data.doneTasks.map((task, i) => {
                  const taskMinutes = task.timeEntries.reduce(
                    (s, e) => s + (e.duration ?? 0),
                    0
                  );
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-4 py-3 ${
                        i < data.doneTasks.length - 1 ? "border-b border-[#252525]" : ""
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white line-clamp-1">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.project && (
                            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: task.project.color }}
                              />
                              {task.project.name}
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-600">
                            {new Date(task.updatedAt).toLocaleDateString("de-DE", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                      {taskMinutes > 0 && (
                        <div className="flex items-center gap-1 text-xs text-blue-400 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          {formatMinutes(taskMinutes)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Zeiterfassung Timeline */}
          {data.totalMinutes > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                <h2 className="text-white font-semibold">Zeiterfassung gesamt</h2>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Gesamte erfasste Zeit</span>
                  <span className="text-white font-semibold">{formatMinutes(data.totalMinutes)}</span>
                </div>
                <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                    style={{ width: `${Math.min(100, (data.totalMinutes / (40 * 60)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-600 mt-2">
                  {Math.round((data.totalMinutes / (40 * 60)) * 100)}% der 40h-Woche
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
