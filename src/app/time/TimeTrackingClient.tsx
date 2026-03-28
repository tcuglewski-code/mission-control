"use client";

import { useState, useMemo } from "react";
import { Clock, Filter, Calendar, TrendingUp } from "lucide-react";
import { format, startOfWeek, isAfter } from "date-fns";
import { de } from "date-fns/locale";

interface TimeEntryWithTask {
  id: string;
  taskId: string;
  userId: string | null;
  description: string | null;
  startTime: string | Date;
  endTime: string | Date | null;
  duration: number | null;
  billable: boolean;
  createdAt: string | Date;
  task: {
    id: string;
    title: string;
    project: { id: string; name: string; color: string } | null;
  };
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Props {
  initialEntries: TimeEntryWithTask[];
  projects: Project[];
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export function TimeTrackingClient({ initialEntries, projects }: Props) {
  const [entries] = useState<TimeEntryWithTask[]>(initialEntries);
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterProjectId && e.task.project?.id !== filterProjectId) return false;
      if (filterDate) {
        const entryDate = format(new Date(e.startTime), "yyyy-MM-dd");
        if (entryDate !== filterDate) return false;
      }
      return true;
    });
  }, [entries, filterProjectId, filterDate]);

  const completedEntries = filtered.filter((e) => e.endTime);
  const totalMinutes = completedEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  // Diese Woche
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEntries = entries.filter(
    (e) => e.endTime && isAfter(new Date(e.startTime), weekStart)
  );
  const weekMinutes = weekEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  // Heute
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayMinutes = entries
    .filter((e) => e.endTime && format(new Date(e.startTime), "yyyy-MM-dd") === todayStr)
    .reduce((sum, e) => sum + (e.duration ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Stats-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-500">Heute</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatMinutes(todayMinutes)}</p>
        </div>
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-500">Diese Woche</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatMinutes(weekMinutes)}</p>
        </div>
        <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-500">Gesamt (gefiltert)</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{formatMinutes(totalMinutes)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500">Filter:</span>
        </div>
        <select
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(e.target.value)}
          className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">Alle Projekte</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
        />
        {(filterProjectId || filterDate) && (
          <button
            onClick={() => { setFilterProjectId(""); setFilterDate(""); }}
            className="text-xs text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-[#252525] transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Eintrags-Tabelle */}
      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">
            Zeiteinträge
            <span className="ml-2 text-xs text-zinc-500">({filtered.length})</span>
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm">
            Keine Zeiteinträge gefunden
          </div>
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            {filtered.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-center gap-4 hover:bg-[#1f1f1f] transition-colors">
                {/* Datum */}
                <div className="w-24 shrink-0">
                  <p className="text-xs text-zinc-300">
                    {format(new Date(entry.startTime), "dd.MM.yyyy", { locale: de })}
                  </p>
                  <p className="text-[10px] text-zinc-600">
                    {format(new Date(entry.startTime), "HH:mm")}
                    {entry.endTime && ` – ${format(new Date(entry.endTime), "HH:mm")}`}
                  </p>
                </div>

                {/* Task + Projekt */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{entry.task.title}</p>
                  {entry.task.project && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: `${entry.task.project.color}20`,
                        color: entry.task.project.color,
                      }}
                    >
                      {entry.task.project.name}
                    </span>
                  )}
                </div>

                {/* Beschreibung */}
                {entry.description && (
                  <p className="text-xs text-zinc-500 max-w-[160px] truncate hidden sm:block">
                    {entry.description}
                  </p>
                )}

                {/* Dauer */}
                <div className="text-right shrink-0">
                  {entry.endTime ? (
                    <span className="text-sm font-mono text-white tabular-nums">
                      {formatMinutes(entry.duration ?? 0)}
                    </span>
                  ) : (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      läuft
                    </span>
                  )}
                </div>

                {/* Billable */}
                <div className="shrink-0">
                  {entry.billable ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      billable
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/30 text-zinc-500">
                      intern
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
