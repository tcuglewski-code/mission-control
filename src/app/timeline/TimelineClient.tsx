"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  addWeeks, addMonths, addQuarters,
  startOfWeek, startOfMonth, startOfQuarter,
  endOfWeek, endOfMonth, endOfQuarter,
  format, differenceInDays, eachDayOfInterval, isWeekend,
  startOfDay, isSameDay
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

// ─── Typen ───────────────────────────────────────────────────────────────────

interface GanttTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate?: string | null;
  dueDate?: string | null;
  project?: { id: string; name: string; color: string } | null;
}

// ─── Farb-Kodierung nach Status ───────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  todo: "#71717a",
  in_progress: "#3b82f6",
  done: "#10b981",
  blocked: "#ef4444",
  review: "#f59e0b",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "Offen",
  in_progress: "In Arbeit",
  done: "Fertig",
  blocked: "Blockiert",
  review: "Review",
};

// ─── Zoom-Modi ────────────────────────────────────────────────────────────────

type ZoomMode = "week" | "month" | "quarter";

function getZoomRange(mode: ZoomMode, anchor: Date): { start: Date; end: Date } {
  switch (mode) {
    case "week":
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(addWeeks(anchor, 3), { weekStartsOn: 1 }),
      };
    case "month":
      return {
        start: startOfMonth(anchor),
        end: endOfMonth(addMonths(anchor, 2)),
      };
    case "quarter":
      return {
        start: startOfQuarter(anchor),
        end: endOfQuarter(addQuarters(anchor, 1)),
      };
  }
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────

const ROW_HEIGHT = 36;
const LABEL_WIDTH = 220;
const MIN_BAR_WIDTH = 4;

export function TimelineClient() {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState<ZoomMode>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Projekte für Filter
  const [projects, setProjects] = useState<{ id: string; name: string; color: string }[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set("projectId", filterProject);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Tasks", err);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterStatus]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => {});
  }, []);

  // Tasks mit Datum filtern
  const tasksWithDates = tasks.filter((t) => t.startDate || t.dueDate);
  const tasksWithoutDates = tasks.filter((t) => !t.startDate && !t.dueDate);

  const { start: rangeStart, end: rangeEnd } = getZoomRange(zoom, anchor);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  const totalDays = days.length;

  // Tagesbreite je nach Zoom
  const dayWidth = zoom === "week" ? 40 : zoom === "month" ? 24 : 10;
  const totalWidth = dayWidth * totalDays;

  const today = startOfDay(new Date());

  // Navigation
  const navigate = (dir: "prev" | "next") => {
    setAnchor((prev) => {
      if (zoom === "week") return dir === "prev" ? addWeeks(prev, -2) : addWeeks(prev, 2);
      if (zoom === "month") return dir === "prev" ? addMonths(prev, -2) : addMonths(prev, 2);
      return dir === "prev" ? addQuarters(prev, -1) : addQuarters(prev, 1);
    });
  };

  const goToday = () => setAnchor(new Date());

  // Balkenposition berechnen
  function barProps(task: GanttTask) {
    const taskStart = task.startDate
      ? startOfDay(new Date(task.startDate))
      : task.dueDate
      ? startOfDay(new Date(task.dueDate))
      : null;
    const taskEnd = task.dueDate
      ? startOfDay(new Date(task.dueDate))
      : task.startDate
      ? startOfDay(new Date(task.startDate))
      : null;

    if (!taskStart || !taskEnd) return null;

    // Position relativ zum Sichtfenster
    const startOffset = differenceInDays(taskStart, rangeStart);
    const durationDays = Math.max(differenceInDays(taskEnd, taskStart) + 1, 1);

    const left = startOffset * dayWidth;
    const width = Math.max(durationDays * dayWidth - 2, MIN_BAR_WIDTH);

    return { left, width, startOffset, durationDays };
  }

  // Monats-Trennlinien für Header
  const monthGroups: { label: string; days: number }[] = [];
  let currentMonth = "";
  let count = 0;
  days.forEach((day) => {
    const m = format(day, zoom === "quarter" ? "MMM yy" : "MMMM yyyy", { locale: de });
    if (m !== currentMonth) {
      if (currentMonth) monthGroups.push({ label: currentMonth, days: count });
      currentMonth = m;
      count = 1;
    } else {
      count++;
    }
  });
  if (currentMonth) monthGroups.push({ label: currentMonth, days: count });

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#2a2a2a] shrink-0">
        <Calendar className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-white">Timeline</span>
        <span className="text-xs text-zinc-500 bg-[#252525] px-2 py-0.5 rounded-full">
          {tasksWithDates.length} Tasks mit Datum
        </span>

        <div className="flex-1" />

        {/* Filter */}
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">Alle Projekte</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">Alle Status</option>
          <option value="todo">Offen</option>
          <option value="in_progress">In Arbeit</option>
          <option value="done">Fertig</option>
          <option value="blocked">Blockiert</option>
        </select>

        {/* Zoom */}
        <div className="flex items-center border border-[#2a2a2a] rounded-lg overflow-hidden">
          {(["week", "month", "quarter"] as ZoomMode[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-3 py-1 text-xs transition-colors ${
                zoom === z
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-[#252525]"
              }`}
            >
              {z === "week" ? "Woche" : z === "month" ? "Monat" : "Quartal"}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <button
          onClick={goToday}
          className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-[#252525] rounded border border-[#2a2a2a] transition-colors"
        >
          Heute
        </button>
        <div className="flex items-center border border-[#2a2a2a] rounded-lg overflow-hidden">
          <button
            onClick={() => navigate("prev")}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate("next")}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#252525] transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Legende */}
      <div className="flex items-center gap-4 px-6 py-2 border-b border-[#2a2a2a] shrink-0">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{ backgroundColor: color + "80", border: `1px solid ${color}` }}
            />
            {STATUS_LABEL[status] ?? status}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
          Lade Timeline...
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex">
          {/* Gantt-Container */}
          <div className="flex-1 overflow-auto" ref={scrollRef}>
            <div style={{ minWidth: LABEL_WIDTH + totalWidth }}>
              {/* ─── Header: Monate + Tage ─── */}
              <div
                className="flex sticky top-0 z-20 bg-[#0f0f0f] border-b border-[#2a2a2a]"
              >
                {/* Label-Spalte */}
                <div
                  className="shrink-0 border-r border-[#2a2a2a] bg-[#161616]"
                  style={{ width: LABEL_WIDTH }}
                />
                {/* Monate */}
                <div className="relative" style={{ width: totalWidth }}>
                  {/* Monats-Zeile */}
                  <div className="flex border-b border-[#2a2a2a] h-6">
                    {monthGroups.map((g, i) => (
                      <div
                        key={i}
                        className="border-r border-[#2a2a2a] flex items-center px-2 overflow-hidden"
                        style={{ width: g.days * dayWidth }}
                      >
                        <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap truncate">
                          {g.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Tages-Zeile (nur bei Woche/Monat) */}
                  {zoom !== "quarter" && (
                    <div className="flex h-6">
                      {days.map((day, i) => (
                        <div
                          key={i}
                          className={`border-r border-[#2a2a2a] flex items-center justify-center ${
                            isWeekend(day) ? "bg-[#1a1a1a]" : ""
                          } ${isSameDay(day, today) ? "bg-emerald-500/10" : ""}`}
                          style={{ width: dayWidth, minWidth: dayWidth }}
                        >
                          <span
                            className={`text-[9px] ${
                              isSameDay(day, today)
                                ? "text-emerald-400 font-bold"
                                : "text-zinc-600"
                            }`}
                          >
                            {format(day, "d")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Task-Zeilen ─── */}
              <div className="relative">
                {/* Hintergrund: heutige Spalte */}
                {(() => {
                  const todayOffset = differenceInDays(today, rangeStart);
                  if (todayOffset >= 0 && todayOffset < totalDays) {
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-emerald-500/40 z-10 pointer-events-none"
                        style={{ left: LABEL_WIDTH + todayOffset * dayWidth + dayWidth / 2 }}
                      />
                    );
                  }
                  return null;
                })()}

                {tasksWithDates.length === 0 ? (
                  <div className="text-center py-16 text-zinc-600 text-sm">
                    Keine Tasks mit Datum gefunden
                  </div>
                ) : (
                  tasksWithDates.map((task) => {
                    const bar = barProps(task);
                    const color = STATUS_COLOR[task.status] ?? "#71717a";

                    return (
                      <div
                        key={task.id}
                        className="flex items-center border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors group"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Label */}
                        <div
                          className="shrink-0 border-r border-[#2a2a2a] px-3 flex items-center gap-2 overflow-hidden"
                          style={{ width: LABEL_WIDTH, height: ROW_HEIGHT }}
                        >
                          {task.project && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: task.project.color }}
                            />
                          )}
                          <span className="text-xs text-zinc-300 truncate group-hover:text-white transition-colors">
                            {task.title}
                          </span>
                        </div>

                        {/* Gantt-Balken */}
                        <div
                          className="relative"
                          style={{ width: totalWidth, height: ROW_HEIGHT }}
                        >
                          {/* Wochenende-Streifen */}
                          {zoom === "week" && days.map((day, i) =>
                            isWeekend(day) ? (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 bg-[#1a1a1a]"
                                style={{ left: i * dayWidth, width: dayWidth }}
                              />
                            ) : null
                          )}

                          {/* Balken */}
                          {bar && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 rounded cursor-pointer transition-opacity hover:opacity-90"
                              style={{
                                left: bar.left,
                                width: bar.width,
                                height: 20,
                                backgroundColor: color + "40",
                                border: `1px solid ${color}80`,
                              }}
                              title={`${task.title} • ${STATUS_LABEL[task.status] ?? task.status}`}
                            >
                              <div
                                className="h-full rounded-l"
                                style={{
                                  width: task.status === "done" ? "100%" : "60%",
                                  backgroundColor: color + "60",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tasks ohne Datum */}
              {tasksWithoutDates.length > 0 && (
                <div className="mt-4 px-4 pb-4">
                  <p className="text-xs text-zinc-600 mb-2">
                    {tasksWithoutDates.length} Tasks ohne Datum (nicht dargestellt)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
